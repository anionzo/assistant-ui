import { ChatShell } from "@/components/chat-shell";
import { resolveSession } from "@/lib/auth/session-resolve";

export const dynamic = "force-dynamic";

export default async function ChatLayout() {
  const session = await resolveSession();
  return <ChatShell initialAuth={!!session} />;
}