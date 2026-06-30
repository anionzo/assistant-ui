import { ChatShell } from "@/components/chat-shell";
import { getSessionCookie } from "@/lib/auth/cookies";

type Params = {
  params: Promise<{ threadId: string }>;
};

export default async function ThreadChatPage({ params }: Params) {
  const token = await getSessionCookie();
  await params;
  return <ChatShell initialAuth={!!token} />;
}