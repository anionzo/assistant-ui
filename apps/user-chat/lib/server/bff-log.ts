type BffLogPayload = {
  level: "info" | "error";
  action: string;
  request_id: string;
  conversation_id?: string;
  user_id?: string;
  duration_ms: number;
  status_code: number;
  error?: string;
};

export function logBffEvent(payload: BffLogPayload) {
  const line = JSON.stringify(payload);
  if (payload.level === "error") {
    console.error(line);
    return;
  }
  console.info(line);
}