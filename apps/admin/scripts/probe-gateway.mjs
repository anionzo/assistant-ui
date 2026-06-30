const b = process.env.GATEWAY ?? "http://171.254.95.87:8030";
const k = process.env.KEY ?? "huit-admission-api-key";
const cid = "huit-admissive-chatbot";

const tests = [
  ["POST", "/document-processing/compat/chunks/search", JSON.stringify({ query: "khai sinh", collection_id: cid, top_k: 3 })],
  ["POST", `/document-processing/compat/collections/${cid}/files/reprocess`, JSON.stringify({ file_ids: [] })],
  ["POST", `/document-processing/compat/collections/${cid}/reprocess`, "{}"],
  ["POST", `/document-processing/compat/collections/${cid}/documents/reprocess`, "{}"],
  ["GET", `/document-processing/compat/collections/${cid}/files`],
  ["POST", `/document-processing/compat/collections/${cid}/publish`, JSON.stringify({ corpus_id: "admission-chatbot-corpus" })],
];

for (const [method, path, body] of tests) {
  const r = await fetch(`${b}${path}`, {
    method,
    headers: { "X-API-Key": k, "Content-Type": "application/json" },
    body,
  });
  const t = await r.text();
  console.log(method, path.slice(0, 90), "->", r.status, t.slice(0, 300));
}

// create collection shape
const createBodies = [
  { name: "probe-2", corpus_id: "admission-chatbot-corpus" },
  { id: "probe-3", name: "probe-3", tenant_id: "huit_admission_chatbot", corpus_id: "admission-chatbot-corpus" },
];
for (const body of createBodies) {
  const r = await fetch(`${b}/document-processing/compat/collections`, {
    method: "POST",
    headers: { "X-API-Key": k, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  console.log("POST create", JSON.stringify(body), "->", r.status, t.slice(0, 250));
}