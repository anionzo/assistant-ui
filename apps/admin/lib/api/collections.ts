import { asArray, bffJson } from "@/lib/api/bff";
import type { Collection, CorpusDocument, CorpusFile, DocumentChunk } from "@/lib/types/gateway";

function collectionPath(id: string, suffix = "") {
  const base = `/api/documents/collections/${encodeURIComponent(id)}`;
  return suffix ? `${base}/${suffix}` : base;
}

export async function listCollections() {
  const config = await bffJson<{ collections?: Collection[] }>("/api/config");
  if (config.collections?.length) return config.collections;
  const payload = await bffJson<unknown>("/api/documents/collections");
  return asArray<Collection>(payload, ["collections", "items", "data"]);
}

export async function getCollection(id: string) {
  return bffJson<Collection>(collectionPath(id));
}

export async function createCollection(body: {
  name: string;
  corpus_id: string;
  description?: string;
}) {
  return bffJson<Collection>("/api/documents/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateCollectionSettings(id: string, parser_config: Record<string, unknown>) {
  return bffJson<Collection>(collectionPath(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parser_config }),
  });
}

export async function uploadDocumentPipeline(collectionId: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return bffJson<CorpusDocument>(
    collectionPath(collectionId, "documents/pipeline"),
    { method: "POST", body },
  );
}

export async function listFiles(collectionId: string) {
  const payload = await bffJson<unknown>(collectionPath(collectionId, "files"));
  return asArray<CorpusFile>(payload, ["files", "items", "data"]);
}

export async function deleteFile(collectionId: string, fileId: string) {
  return bffJson(collectionPath(collectionId, `files/${encodeURIComponent(fileId)}`), {
    method: "DELETE",
  });
}

export async function listDocuments(collectionId: string) {
  const payload = await bffJson<unknown>(collectionPath(collectionId, "documents"));
  return asArray<CorpusDocument>(payload, ["documents", "items", "data"]);
}

export async function getDocument(collectionId: string, documentId: string) {
  return bffJson<CorpusDocument>(collectionPath(collectionId, `documents/${encodeURIComponent(documentId)}`));
}

export async function listDocumentChunks(collectionId: string, documentId: string) {
  const payload = await bffJson<unknown>(
    collectionPath(collectionId, `documents/${encodeURIComponent(documentId)}/chunks`),
  );
  return asArray<DocumentChunk>(payload, ["chunks", "items", "data"]);
}

export async function reprocessDocument(collectionId: string, documentId: string) {
  return bffJson(
    collectionPath(collectionId, `documents/${encodeURIComponent(documentId)}/reprocess`),
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
}

export async function publishCollection(collectionId: string, corpusId: string) {
  return bffJson(collectionPath(collectionId, "publish"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ corpus_id: corpusId }),
  });
}

export function indexStatusForFile(fileId: string, documents: CorpusDocument[]) {
  const doc = documents.find((d) => d.file_id === fileId);
  if (!doc) return { label: "Pending", tone: "pending" as const };
  if (doc.error) return { label: `Error: ${doc.error}`, tone: "error" as const };
  if (doc.status === "READY" || (doc.progress ?? 0) >= 1) {
    return { label: `Ready (${doc.chunk_count ?? 0} chunks)`, tone: "ready" as const };
  }
  const pct = Math.round((doc.progress ?? 0) * 100);
  return { label: `${doc.status ?? "Indexing"} ${pct}%`, tone: "indexing" as const };
}