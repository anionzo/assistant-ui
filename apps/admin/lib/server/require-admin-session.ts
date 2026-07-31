import { resolveSession, type ResolvedSession } from "@/lib/auth/session-resolve";

export type AdminSessionResult =
  | { ok: true; session: ResolvedSession }
  | { ok: false; error: string; status: number };

function hasAdminRole(session: ResolvedSession): boolean {
  return Array.isArray(session.user.roleIds) && session.user.roleIds.length > 0;
}

function hasPermission(session: ResolvedSession, permissionId: number): boolean {
  return Array.isArray(session.user.permissionIds)
    && session.user.permissionIds.includes(permissionId);
}

export async function requireAdminSession(): Promise<AdminSessionResult> {
  const session = await resolveSession();
  if (!session) {
    return { ok: false, error: "authentication required", status: 401 };
  }
  if (!hasAdminRole(session)) {
    return { ok: false, error: "admin access required", status: 403 };
  }
  return { ok: true, session };
}

export async function requireAdminPermission(permissionId: number): Promise<AdminSessionResult> {
  const result = await requireAdminSession();
  if (!result.ok) return result;
  if (!hasPermission(result.session, permissionId)) {
    return { ok: false, error: `missing permission id: ${permissionId}`, status: 403 };
  }
  return result;
}

export async function requireAdminAnyPermission(permissionIds: number[]): Promise<AdminSessionResult> {
  const result = await requireAdminSession();
  if (!result.ok) return result;
  if (!permissionIds.some((id) => hasPermission(result.session, id))) {
    return { ok: false, error: `missing permission id: ${permissionIds.join(" | ")}`, status: 403 };
  }
  return result;
}
