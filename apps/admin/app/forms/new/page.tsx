"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { useT } from "@idx/i18n";
import { AdminShell } from "@/components/admin-shell";
import { ApiErrorBanner } from "@/components/api-error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BffRequestError, bffJson } from "@/lib/api/bff";
import {
  formFileAcceptAttribute,
  isAllowedFormFileName,
  parseFormIngestResponse,
} from "@/lib/forms/ingest";
import { formDetailHref, saveFormIngestReceipt } from "@/lib/forms/upload-feedback";

export default function NewFormPage() {
  const t = useT();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const nameInput = form.elements.namedItem("form_name") as HTMLInputElement | null;
    const keywordsInput = form.elements.namedItem("keywords") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError(new Error(t("forms.chooseFile")));
      return;
    }
    if (!isAllowedFormFileName(file.name)) {
      setError(new Error(t("forms.unsupportedFileType")));
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // Gateway POST /forms/ingest fields (via BFF /api/forms → /rag/admin/forms).
      const body = new FormData();
      body.append("file", file);
      if (nameInput?.value.trim()) body.append("form_name", nameInput.value.trim());
      if (keywordsInput?.value.trim()) body.append("keywords", keywordsInput.value.trim());
      body.append("extract_schema", "true");

      const payload = await bffJson<unknown>("/api/forms", {
        method: "POST",
        body,
      });

      // Gateway FormIngestResponse:
      // { form_code, status: "queued", job_id, schema_version?, template_path? }
      const ingest = parseFormIngestResponse(payload);
      if (!ingest) {
        setError(
          new BffRequestError(t("forms.uploadNoCode"), 200, {
            code: "missing_form_code",
          }),
        );
        return;
      }

      // Keep full receipt (incl. template_path) for detail banner — too long for URL.
      saveFormIngestReceipt({
        ...ingest,
        fileName: file.name,
        savedAt: Date.now(),
      });

      // status "queued" = stream job enqueued after Temporal pipeline returned.
      // Schema is not in this response — detail page polls GET /forms/{code}.
      router.push(
        formDetailHref(ingest.formCode, {
          processing: true,
          uploaded: true,
          fileName: file.name,
          jobId: ingest.jobId,
          status: ingest.status,
          schemaVersion: ingest.schemaVersion,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminShell title={t("forms.uploadTitle")} description={t("forms.uploadDescription")}>
      <Link href="/forms" className="mb-4 inline-block text-sm text-primary hover:underline">
        {t("common.backToForms")}
      </Link>

      <form
        ref={formRef}
        onSubmit={(e) => void handleUpload(e)}
        className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">{t("forms.formFile")}</label>
          <Input
            name="file"
            type="file"
            required
            disabled={uploading}
            accept={formFileAcceptAttribute()}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("forms.uploadFileHint")}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("forms.formNameOptional")}</label>
          <Input
            name="form_name"
            placeholder={t("forms.formNamePlaceholder")}
            disabled={uploading}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("forms.keywordsOptional")}</label>
          <Input
            name="keywords"
            placeholder={t("forms.keywordsPlaceholder")}
            disabled={uploading}
          />
        </div>
        <Button type="submit" disabled={uploading}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? t("forms.uploadingIngest") : t("forms.uploadAndIngest")}
        </Button>
        {uploading ? (
          <p className="text-xs text-muted-foreground">{t("forms.uploadWait")}</p>
        ) : null}
      </form>

      {error ? (
        <div className="mt-4 max-w-xl">
          <ApiErrorBanner error={error} fallback={t("forms.uploadFailed")} />
        </div>
      ) : null}
    </AdminShell>
  );
}
