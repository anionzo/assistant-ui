import { ChatShell } from "@/components/chat-shell";
import { resolveSession } from "@/lib/auth/session-resolve";

type Params = {
  params: Promise<{ threadId: string }>;
};

export default async function ThreadChatPage({ params }: Params) {
  const session = await resolveSession();
  await params;
  return <ChatShell initialAuth={!!session} />;
}