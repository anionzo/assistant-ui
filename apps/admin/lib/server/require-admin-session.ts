import { resolveSession, type ResolvedSession } from "@/lib/auth/session-resolve";

export type AdminSessionResult =
  | { ok: true; session: ResolvedSession }
  | { ok: false; error: string; status: number };

export async function requireAdminSession(): Promise<AdminSessionResult> {
  const session = await resolveSession();
  if (!session) {
    return { ok: false, error: "authentication required", status: 401 };
  }
  if (session.user.roleIds.length === 0) {
    return { ok: false, error: "admin access required", status: 403 };
  }
  return { ok: true, session };
}

export async function requireAdminPermission(permissionId: number): Promise<AdminSessionResult> {
  const result = await requireAdminSession();
  if (!result.ok) return result;
  if (!result.session.user.permissionIds.includes(permissionId)) {
    return { ok: false, error: `missing permission id: ${permissionId}`, status: 403 };
  }
  return result;
}

export async function requireAdminAnyPermission(permissionIds: number[]): Promise<AdminSessionResult> {
  const result = await requireAdminSession();
  if (!result.ok) return result;
  if (!permissionIds.some((id) => result.session.user.permissionIds.includes(id))) {
    return { ok: false, error: `missing permission id: ${permissionIds.join(" | ")}`, status: 403 };
  }
  return result;
}
