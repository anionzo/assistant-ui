"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bffJson } from "@/lib/api/bff";

export default function NewFormPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
    try {
      const body = new FormData();
      body.append("file", file);
      if (codeInput?.value.trim()) {
        body.append("form_code", codeInput.value.trim());
      }
      const result = await bffJson<{ form_code?: string; code?: string }>("/api/forms", {
        method: "POST",
        body,
      });
      const code = result.form_code ?? result.code;
      if (code) {
        router.push(`/forms/${encodeURIComponent(code)}`);
        return;
      }
      router.push("/forms");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminShell title="Upload form" description="Ingest a new form definition via /forms/ingest.">
      <Link href="/forms" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to forms
      </Link>

      <form
        onSubmit={(e) => void handleUpload(e)}
        className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Form code (optional)</label>
          <Input name="form_code" placeholder="admission_form_v1" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Form file</label>
          <Input name="file" type="file" required />
        </div>
        <Button type="submit" disabled={uploading}>
          <Upload className="size-4" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </form>

      {error ? (
        <div className="mt-4">
          <StatusBanner tone="error">{error}</StatusBanner>
        </div>
      ) : null}
    </AdminShell>
  );
}