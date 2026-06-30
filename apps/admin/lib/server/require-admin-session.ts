import { resolveAdminSession, type ResolvedSession } from "@/lib/auth/session-resolve";

export type AdminSessionResult =
  | { ok: true; session: ResolvedSession }
  | { ok: false; error: string; status: number };

export async function requireAdminSession(): Promise<AdminSessionResult> {
  const session = await resolveAdminSession();
  if (!session) {
    return { ok: false, error: "admin authentication required", status: 401 };
  }
  return { ok: true, session };
}
