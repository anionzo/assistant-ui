export function chatPath(threadId?: string) {
  return threadId ? `/chat/${threadId}` : "/chat";
}