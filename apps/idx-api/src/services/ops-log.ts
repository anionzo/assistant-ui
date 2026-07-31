/**
 * In-process ring buffer of recent API / gateway events for operator debugging.
 * Not durable across restarts — intentional lightweight ops view.
 */

export type OpsLogLevel = "info" | "warn" | "error";

export type OpsLogEntry = {
  id: string;
  ts: string;
  level: OpsLogLevel;
  source: string;
  message: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  detail?: string;
};

const MAX_ENTRIES = 300;
const store: OpsLogEntry[] = [];

function levelFromStatus(status: number): OpsLogLevel {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "info";
}

export function pushOpsLog(
  input: Omit<OpsLogEntry, "id" | "ts"> & { ts?: string },
): OpsLogEntry {
  const entry: OpsLogEntry = {
    id: crypto.randomUUID(),
    ts: input.ts ?? new Date().toISOString(),
    level: input.level,
    source: input.source,
    message: input.message.slice(0, 500),
    requestId: input.requestId,
    method: input.method,
    path: input.path?.slice(0, 300),
    status: input.status,
    durationMs: input.durationMs,
    detail: input.detail?.slice(0, 800),
  };
  store.push(entry);
  if (store.length > MAX_ENTRIES) {
    store.splice(0, store.length - MAX_ENTRIES);
  }
  return entry;
}

export function logHttpRequest(input: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId?: string;
  detail?: string;
}) {
  // Skip noisy health probes unless they fail.
  if (
    (input.path === "/health" || input.path === "/health/rag")
    && input.status < 400
  ) {
    return;
  }

  const level = levelFromStatus(input.status);
  // Keep traffic volume manageable: only store errors/warns + interesting paths.
  const interesting =
    level !== "info"
    || input.path.startsWith("/rag/")
    || input.path.startsWith("/forms")
    || input.path.startsWith("/voice-form")
    || input.path.startsWith("/auth/")
    || input.durationMs >= 3_000;

  if (!interesting) return;

  pushOpsLog({
    level,
    source: "http",
    message: `${input.method} ${input.path} → ${input.status} (${input.durationMs}ms)`,
    method: input.method,
    path: input.path,
    status: input.status,
    durationMs: input.durationMs,
    requestId: input.requestId,
    detail: input.detail,
  });
}

export function logGatewayEvent(input: {
  level?: OpsLogLevel;
  upstreamPath: string;
  method: string;
  status: number;
  requestId?: string;
  message: string;
  detail?: string;
}) {
  pushOpsLog({
    level: input.level ?? levelFromStatus(input.status),
    source: "gateway",
    message: input.message.slice(0, 500),
    method: input.method,
    path: input.upstreamPath,
    status: input.status,
    requestId: input.requestId,
    detail: input.detail,
  });
}

export function listOpsLogs(opts?: {
  limit?: number;
  level?: OpsLogLevel | "all";
  q?: string;
}): { entries: OpsLogEntry[]; total: number; capacity: number } {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), MAX_ENTRIES);
  const level = opts?.level ?? "all";
  const q = opts?.q?.trim().toLowerCase();

  let filtered = store.slice();
  if (level !== "all") {
    filtered = filtered.filter((e) => e.level === level);
  }
  if (q) {
    filtered = filtered.filter((e) => {
      const hay = `${e.message} ${e.path ?? ""} ${e.detail ?? ""} ${e.requestId ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // Newest first
  filtered.reverse();
  return {
    entries: filtered.slice(0, limit),
    total: filtered.length,
    capacity: MAX_ENTRIES,
  };
}

export function clearOpsLogs() {
  store.length = 0;
}

/** Test helper */
export function _resetOpsLogsForTests() {
  clearOpsLogs();
}
