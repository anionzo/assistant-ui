import { ChatShell } from "@/components/chat-shell";
import { getSessionCookie } from "@/lib/auth/cookies";

export default async function NewChatPage() {
  const token = await getSessionCookie();
  return <ChatShell initialAuth={!!token} />;
}