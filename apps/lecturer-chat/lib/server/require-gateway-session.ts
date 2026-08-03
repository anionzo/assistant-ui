import { resolveSession, type ResolvedSession } from "@/lib/auth/session-resolve";
import { scopedConversationId } from "@/lib/server/conversation-id";
import { errorResponse } from "@/lib/server/errors";
import { getServerConfig } from "@/lib/server/config";

export type GatewaySession =
  | { ok: true; session: ResolvedSession | null; conversationId: string; userId?: string }
  | { ok: false; response: Response };

export async function requireGatewaySession(
  conversationId: string,
  requestId: string,
): Promise<GatewaySession> {
  const config = getServerConfig();
  let scopedId = conversationId.trim();

  // allowGuestChat is the dedicated flag to control chatting without login
  if (config.allowGuestChat) {
    return { ok: true, session: null, conversationId: scopedId };
  }

  const session = await resolveSession();
  if (!session) {
    return {
      ok: false,
      response: errorResponse("Missing session cookie", "missing_session", 401, requestId),
    };
  }

  scopedId = scopedConversationId(session.user.id, scopedId);
  return {
    ok: true,
    session,
    conversationId: scopedId,
    userId: session.user.id,
  };
}