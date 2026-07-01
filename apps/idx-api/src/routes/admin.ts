import { Hono } from "hono";
import { type AuthStore, getAuthStore } from "../db/store";
import { requireAnyPermission, requireAuth, requirePermission } from "../middleware/auth";
import { normalizeClientIp } from "../utils/ip-allowlist";
import {
  getAdminIpAllowlistSettings,
  updateAdminIpAllowlistSettings,
} from "../services/admin-ip-allowlist-config";
import { getBrandingSettings, updateBrandingSettings } from "../services/branding-config";
import { getChatRuntimeSettings, updateChatRuntimeSettings } from "../services/chat-runtime-config";
import { PERMISSIONS } from "../services/permissions";
import { hashPassword } from "../services/password";
import { ErrorCode } from "../utils/errors";
import { buildPaginationMeta, parsePaginationQuery } from "../utils/pagination";
import { badRequest, forbidden, notFound, ok, okPlain } from "../utils/response";

export function createAdminRoutes(store: AuthStore = getAuthStore()) {
  const adminRoutes = new Hono();

  adminRoutes.use("*", requireAuth);

  // GET /admin/users — paginated user list (?page=1&limit=20&q=email)
  adminRoutes.get("/users", requirePermission(PERMISSIONS.USERS_LIST), async (c) => {
    const { page, limit } = parsePaginationQuery({
      page: c.req.query("page"),
      limit: c.req.query("limit"),
    });
    const search = c.req.query("q")?.trim().toLowerCase();
    const result = await store.listUsersPage({ page, limit, search: search || undefined });
    return ok(c, {
      users: result.items.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        status: u.status,
        createdAt: u.createdAt,
      })),
      pagination: buildPaginationMeta(result.total, result.page, result.limit),
    });
  });

  // GET /admin/users/:id — get user with roles
  adminRoutes.get("/users/:id", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const userId = c.req.param("id");
    const user = await store.findUserById(userId);
    if (!user) return notFound(c, "user not found");

    const roles = await store.findUserRoles(userId);
    const permissions = await store.findUserPermissionCodes(userId);

    return ok(c, {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
      },
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions,
    });
  });

  // PATCH /admin/users/:id — update user
  adminRoutes.patch("/users/:id", requirePermission(PERMISSIONS.USERS_UPDATE), async (c) => {
    const userId = c.req.param("id");
    const body = await c.req.json<{ displayName?: string }>().catch(() => null);
    if (!body) return badRequest(c, "invalid body");

    const user = await store.updateUser(userId, {
      displayName: body.displayName,
    });
    if (!user) return notFound(c, "user not found");

    return ok(c, {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
      },
    });
  });

  // POST /admin/users/:id/roles — assign role
  adminRoutes.post("/users/:id/roles", requirePermission(PERMISSIONS.USERS_ASSIGN_ROLES), async (c) => {
    const userId = c.req.param("id");
    const body = await c.req.json<{ roleName?: string }>().catch(() => null);
    if (!body?.roleName) return badRequest(c, "roleName is required");

    const user = await store.findUserById(userId);
    if (!user) return notFound(c, "user not found");

    await store.ensureUserRole(userId, body.roleName);

    const roles = await store.findUserRoles(userId);
    const permissions = await store.findUserPermissionCodes(userId);

    return ok(c, {
      user: { id: user.id, email: user.email, status: user.status },
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions,
    });
  });

  // DELETE /admin/users/:id/roles — revoke role from user
  adminRoutes.delete("/users/:id/roles", requirePermission(PERMISSIONS.USERS_ASSIGN_ROLES), async (c) => {
    const userId = c.req.param("id");
    const body = await c.req.json<{ roleName?: string }>().catch(() => null);
    if (!body?.roleName) return badRequest(c, "roleName is required");

    const user = await store.findUserById(userId);
    if (!user) return notFound(c, "user not found");

    await store.revokeUserRole(userId, body.roleName);

    const roles = await store.findUserRoles(userId);
    return ok(c, {
      user: { id: user.id, email: user.email, status: user.status },
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
    });
  });

  // PATCH /admin/users/:id/ban — ban/unban user
  adminRoutes.patch("/users/:id/ban", requirePermission(PERMISSIONS.USERS_BAN), async (c) => {
    const userId = c.req.param("id");
    const body = await c.req.json<{ status?: string }>().catch(() => null);
    if (!body?.status || !["active", "banned"].includes(body.status)) {
      return badRequest(c, "status must be 'active' or 'banned'");
    }

    const user = await store.findUserById(userId);
    if (!user) return notFound(c, "user not found");

    await store.setUserStatus(userId, body.status);
    if (body.status === "banned") {
      await store.revokeAllUserTokens(userId);
    }

    return ok(c, { user: { id: user.id, email: user.email, status: body.status } });
  });

  // POST /admin/users/:id/reset-password — force reset user password
  adminRoutes.post("/users/:id/reset-password", requirePermission(PERMISSIONS.USERS_RESET_PASSWORD), async (c) => {
    const userId = c.req.param("id");
    const body = await c.req.json<{ password?: string }>().catch(() => null);
    if (!body?.password || body.password.length < 8) {
      return badRequest(c, "password must be at least 8 characters");
    }

    const user = await store.findUserById(userId);
    if (!user) return notFound(c, "user not found");

    await store.setUserPassword(userId, await hashPassword(body.password));
    return ok(c, { user: { id: user.id, email: user.email } });
  });

  // POST /admin/users/:id/force-logout — revoke all sessions
  adminRoutes.post("/users/:id/force-logout", requirePermission(PERMISSIONS.USERS_FORCE_LOGOUT), async (c) => {
    const userId = c.req.param("id");
    const user = await store.findUserById(userId);
    if (!user) return notFound(c, "user not found");

    await store.revokeAllUserTokens(userId);
    return ok(c, { user: { id: user.id, email: user.email } });
  });

  // DELETE /admin/users/:id — delete user account
  adminRoutes.delete("/users/:id", requirePermission(PERMISSIONS.USERS_DELETE), async (c) => {
    const userId = c.req.param("id");
    const user = await store.findUserById(userId);
    if (!user) return notFound(c, "user not found");

    await store.revokeAllUserTokens(userId);
    await store.deleteUserAccount(userId);
    return okPlain(c);
  });

  // GET /admin/roles — list all roles
  adminRoutes.get("/roles", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const roleList = await store.listRoles();
    return ok(c, { roles: roleList.map((r) => ({ id: r.id, name: r.name, description: r.description })) });
  });

  // GET /admin/roles/:id/permissions — list permissions for a role
  adminRoutes.get("/roles/:id/permissions", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const roleId = Number(c.req.param("id"));
    if (isNaN(roleId)) return badRequest(c, "invalid role id");
    const perms = await store.getRolePermissions(roleId);
    return ok(c, { permissions: perms });
  });

  // POST /admin/roles/:id/permissions — assign permission to role
  adminRoutes.post("/roles/:id/permissions", requirePermission(PERMISSIONS.USERS_ASSIGN_ROLES), async (c) => {
    const roleId = Number(c.req.param("id"));
    if (isNaN(roleId)) return badRequest(c, "invalid role id");
    const body = await c.req.json<{ permissionId?: number }>().catch(() => null);
    if (!body?.permissionId) return badRequest(c, "permissionId is required");
    await store.assignRolePermission(roleId, body.permissionId);
    return okPlain(c);
  });

  // DELETE /admin/roles/:id/permissions — unassign permission from role
  adminRoutes.delete("/roles/:id/permissions", requirePermission(PERMISSIONS.USERS_ASSIGN_ROLES), async (c) => {
    const roleId = Number(c.req.param("id"));
    if (isNaN(roleId)) return badRequest(c, "invalid role id");
    const body = await c.req.json<{ permissionId?: number }>().catch(() => null);
    if (!body?.permissionId) return badRequest(c, "permissionId is required");
    await store.revokeRolePermission(roleId, body.permissionId);
    return okPlain(c);
  });

  // GET /admin/permissions — list all permissions
  adminRoutes.get("/permissions", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const permList = await store.listPermissions();
    return ok(c, { permissions: permList.map((p) => ({ id: p.id, code: p.code, name: p.name, resource: p.resource, action: p.action })) });
  });

  // GET /admin/settings/ip-allowlist
  adminRoutes.get("/settings/ip-allowlist", requirePermission(PERMISSIONS.SECURITY_IP_ALLOWLIST), async (c) => {
    const settings = await getAdminIpAllowlistSettings();
    return ok(c, { settings });
  });

  // PATCH /admin/settings/ip-allowlist
  adminRoutes.patch("/settings/ip-allowlist", requirePermission(PERMISSIONS.SECURITY_IP_ALLOWLIST), async (c) => {
    const auth = c.get("auth");
    const body = await c.req.json<{
      enabled?: boolean;
      ips?: string[];
      addIp?: string;
      removeIp?: string;
      clientIp?: string;
    }>().catch(() => null);
    if (!body) return badRequest(c, "invalid body");

    const clientIp =
      normalizeClientIp(body.clientIp ?? c.req.header("x-client-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1");

    try {
      const settings = await updateAdminIpAllowlistSettings({
        enabled: body.enabled,
        ips: body.ips,
        addIp: body.addIp,
        removeIp: body.removeIp,
        updatedBy: auth.session.id,
        clientIp,
      });
      return ok(c, { settings });
    } catch (error) {
      const message = error instanceof Error ? error.message : "update failed";
      if (message === "invalid_ip") return badRequest(c, "invalid IP or CIDR");
      if (message === "ips_required") return badRequest(c, "add at least one IP before enabling");
      if (message === "client_ip_not_allowed") {
        return badRequest(c, "your current IP must be in the allowlist before enabling");
      }
      throw error;
    }
  });

  // GET /admin/settings/branding
  adminRoutes.get(
    "/settings/branding",
    requireAnyPermission([PERMISSIONS.SETTINGS_BRANDING_READ, PERMISSIONS.SETTINGS_BRANDING]),
    async (c) => {
    const branding = await getBrandingSettings();
    return ok(c, { branding });
    },
  );

  // PATCH /admin/settings/branding
  adminRoutes.patch("/settings/branding", requirePermission(PERMISSIONS.SETTINGS_BRANDING), async (c) => {
    const auth = c.get("auth");
    const body = await c.req.json<{
      logoUrl?: string;
      admin?: { appName?: string; tagline?: string };
      user?: { appName?: string; tagline?: string };
    }>().catch(() => null);
    if (!body) return badRequest(c, "invalid body");

    try {
      const branding = await updateBrandingSettings({
        logoUrl: body.logoUrl,
        admin: body.admin,
        user: body.user,
        updatedBy: auth.session.id,
      });
      return ok(c, { branding });
    } catch (error) {
      const message = error instanceof Error ? error.message : "update failed";
      if (message === "invalid_logo_url") return badRequest(c, "invalid logo URL");
      if (message === "invalid_admin_app_name") return badRequest(c, "invalid admin app name");
      if (message === "invalid_admin_tagline") return badRequest(c, "invalid admin tagline");
      if (message === "invalid_user_app_name") return badRequest(c, "invalid user app name");
      if (message === "invalid_user_tagline") return badRequest(c, "invalid user tagline");
      throw error;
    }
  });

  // GET /admin/settings/chat-runtime
  adminRoutes.get(
    "/settings/chat-runtime",
    requireAnyPermission([PERMISSIONS.SETTINGS_RUNTIME_READ, PERMISSIONS.SETTINGS_RUNTIME]),
    async (c) => {
      const chatRuntime = await getChatRuntimeSettings();
      return ok(c, { chatRuntime });
    },
  );

  // PATCH /admin/settings/chat-runtime
  adminRoutes.patch("/settings/chat-runtime", requirePermission(PERMISSIONS.SETTINGS_RUNTIME), async (c) => {
    const auth = c.get("auth");
    const body = await c.req.json<{
      tenantId?: string;
      tenantDisplayName?: string;
      defaultCorpusId?: string;
      defaultChatPipeline?: string;
      defaultVoicePipeline?: string;
      defaultTopK?: number;
    }>().catch(() => null);
    if (!body) return badRequest(c, "invalid body");

    try {
      const chatRuntime = await updateChatRuntimeSettings({
        ...body,
        updatedBy: auth.session.id,
      });
      return ok(c, { chatRuntime });
    } catch (error) {
      const message = error instanceof Error ? error.message : "update failed";
      if (message.startsWith("invalid_")) return badRequest(c, message.replaceAll("_", " "));
      throw error;
    }
  });

  // GET /admin/stats — system stats
  adminRoutes.get("/stats", requirePermission(PERMISSIONS.USERS_LIST), async (c) => {
    const [userCount, roleList] = await Promise.all([
      store.countUsers(),
      store.listRoles(),
    ]);

    return ok(c, {
      userCount,
      roleCount: roleList.length,
    });
  });

  return adminRoutes;
}
