"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bffJson } from "@/lib/api/bff";
import { formDetailHref, formsListHref } from "@/lib/forms/upload-feedback";

type UploadSuccess = {
  code: string;
  fileName: string;
  formName?: string;
};

export default function NewFormPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<UploadSuccess | null>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const codeInput = form.elements.namedItem("form_code") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Choose a form file to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess(null);
    try {
      const body = new FormData();
      body.append("file", file);
      if (codeInput?.value.trim()) {
        body.append("form_code", codeInput.value.trim());
      }
      const result = await bffJson<{
        form_code?: string;
        code?: string;
        form_name?: string;
        title?: string;
        name?: string;
      }>("/api/forms", {
        method: "POST",
        body,
      });

      const code = String(result.form_code ?? result.code ?? codeInput?.value.trim() ?? "").trim();
      if (!code) {
        setError("Upload completed but no form code was returned — check the forms list.");
        return;
      }

      setSuccess({
        code,
        fileName: file.name,
        formName: result.form_name ?? result.title ?? result.name,
      });
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleUploadAnother() {
    setSuccess(null);
    setError("");
    formRef.current?.reset();
  }

  return (
    <AdminShell title="Upload form" description="Ingest a new form definition via /forms/ingest.">
      <Link href="/forms" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to forms
      </Link>

      {success ? (
        <div className="max-w-xl space-y-4">
          <StatusBanner tone="success">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Form uploaded successfully</p>
                <p>
                  <span className="font-mono">{success.code}</span>
                  {success.formName ? (
                    <>
                      {" "}
                      — <span>{success.formName}</span>
                    </>
                  ) : null}
                </p>
                <p className="text-emerald-900/80">File: {success.fileName}</p>
              </div>
            </div>
          </StatusBanner>

          <div className="flex flex-wrap gap-2">
            <Link
              href={formDetailHref(success.code, { uploaded: true, fileName: success.fileName })}
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              View form schema
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={handleUploadAnother}>
              Upload another
            </Button>
            <Link
              href={formsListHref(true)}
              className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"
            >
              Back to forms list
            </Link>
          </div>
        </div>
      ) : (
        <form
          ref={formRef}
          onSubmit={(e) => void handleUpload(e)}
          className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Form code (optional)</label>
            <Input name="form_code" placeholder="admission_form_v1" disabled={uploading} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Form file</label>
            <Input name="file" type="file" required disabled={uploading} />
          </div>
          <Button type="submit" disabled={uploading}>
            <Upload className="size-4" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          {uploading ? (
            <p className="text-xs text-muted-foreground">Sending file to gateway — please wait…</p>
          ) : null}
        </form>
      )}

      {error ? (
        <div className="mt-4 max-w-xl">
          <StatusBanner tone="error">{error}</StatusBanner>
        </div>
      ) : null}
    </AdminShell>
  );
}