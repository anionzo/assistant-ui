import { ChatShell } from "@/components/chat-shell";
import { checkSession } from "@/lib/auth/session-resolve";

export const dynamic = "force-dynamic";

export default async function ChatLayout() {
  const session = await checkSession();
  return <ChatShell initialAuth={!!session} />;
}