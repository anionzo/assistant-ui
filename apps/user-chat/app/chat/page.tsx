import { ChatShell } from "@/components/chat-shell";
import { resolveSession } from "@/lib/auth/session-resolve";

export default async function NewChatPage() {
  const session = await resolveSession();
  return <ChatShell initialAuth={!!session} />;
}