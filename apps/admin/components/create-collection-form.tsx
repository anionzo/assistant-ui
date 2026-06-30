"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createCollection } from "@/lib/api/collections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBanner } from "@/components/status-banner";

export function CreateCollectionForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [corpusId, setCorpusId] = useState("admission-chatbot-corpus");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createCollection({
        name: name.trim(),
        corpus_id: corpusId.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setName("");
      setDescription("");
      setOpen(false);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create collection");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New collection
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="w-full max-w-xl space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <p className="text-sm font-medium">Create collection</p>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="admission-docs-2026" required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Corpus ID</label>
        <Input value={corpusId} onChange={(e) => setCorpusId(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Description (optional)</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}