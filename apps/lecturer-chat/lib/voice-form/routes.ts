export function voiceFormPath(sessionId?: string) {
  return sessionId ? `/voice-form/${encodeURIComponent(sessionId)}` : "/voice-form";
}