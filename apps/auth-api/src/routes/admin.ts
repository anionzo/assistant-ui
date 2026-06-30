import { Hono } from "hono";
import { type AuthStore, getAuthStore } from "../db/store";
import { requireAuth, requirePermission } from "../middleware/auth";
import { PERMISSIONS } from "../services/permissions";
import { hashPassword } from "../services/password";

export function createAdminRoutes(store: AuthStore = getAuthStore()) {
  const adminRoutes = new Hono();

  adminRoutes.use("*", requireAuth);

  // GET /admin/users — list all users
  adminRoutes.get("/users", requirePermission(PERMISSIONS.USERS_LIST), async (c) => {
    const users = await store.listAllUsers();
    return c.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        status: u.status,
        createdAt: u.createdAt,
      })),
    });
  });

  // GET /admin/users/:id — get user with roles
  adminRoutes.get("/users/:id", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const userId = c.req.param("id");
    const user = await store.findUserById(userId);
    if (!user) return c.json({ error: "user not found" }, 404);

    const roles = await store.findUserRoles(userId);
    const permissions = await store.findUserPermissionCodes(userId);

    return c.json({
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
    if (!body) return c.json({ error: "invalid body" }, 400);

    const user = await store.updateUser(userId, {
      displayName: body.displayName,
    });
    if (!user) return c.json({ error: "user not found" }, 404);

    return c.json({
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
    if (!body?.roleName) return c.json({ error: "roleName is required" }, 400);

    const user = await store.findUserById(userId);
    if (!user) return c.json({ error: "user not found" }, 404);

    await store.ensureUserRole(userId, body.roleName);

    const roles = await store.findUserRoles(userId);
    const permissions = await store.findUserPermissionCodes(userId);

    return c.json({
      user: { id: user.id, email: user.email, status: user.status },
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions,
    });
  });

  // DELETE /admin/users/:id/roles — revoke role from user
  adminRoutes.delete("/users/:id/roles", requirePermission(PERMISSIONS.USERS_ASSIGN_ROLES), async (c) => {
    const userId = c.req.param("id");
    const body = await c.req.json<{ roleName?: string }>().catch(() => null);
    if (!body?.roleName) return c.json({ error: "roleName is required" }, 400);

    const user = await store.findUserById(userId);
    if (!user) return c.json({ error: "user not found" }, 404);

    await store.revokeUserRole(userId, body.roleName);

    const roles = await store.findUserRoles(userId);
    return c.json({
      user: { id: user.id, email: user.email, status: user.status },
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
    });
  });

  // PATCH /admin/users/:id/ban — ban/unban user
  adminRoutes.patch("/users/:id/ban", requirePermission(PERMISSIONS.USERS_BAN), async (c) => {
    const userId = c.req.param("id");
    const body = await c.req.json<{ status?: string }>().catch(() => null);
    if (!body?.status || !["active", "banned"].includes(body.status)) {
      return c.json({ error: "status must be 'active' or 'banned'" }, 400);
    }

    const user = await store.findUserById(userId);
    if (!user) return c.json({ error: "user not found" }, 404);

    await store.setUserStatus(userId, body.status);
    if (body.status === "banned") {
      await store.revokeAllUserTokens(userId);
    }

    return c.json({ user: { id: user.id, email: user.email, status: body.status } });
  });

  // POST /admin/users/:id/reset-password — force reset user password
  adminRoutes.post("/users/:id/reset-password", requirePermission(PERMISSIONS.USERS_RESET_PASSWORD), async (c) => {
    const userId = c.req.param("id");
    const body = await c.req.json<{ password?: string }>().catch(() => null);
    if (!body?.password || body.password.length < 8) {
      return c.json({ error: "password must be at least 8 characters" }, 400);
    }

    const user = await store.findUserById(userId);
    if (!user) return c.json({ error: "user not found" }, 404);

    await store.setUserPassword(userId, await hashPassword(body.password));
    return c.json({ ok: true, user: { id: user.id, email: user.email } });
  });

  // POST /admin/users/:id/force-logout — revoke all sessions
  adminRoutes.post("/users/:id/force-logout", requirePermission(PERMISSIONS.USERS_FORCE_LOGOUT), async (c) => {
    const userId = c.req.param("id");
    const user = await store.findUserById(userId);
    if (!user) return c.json({ error: "user not found" }, 404);

    await store.revokeAllUserTokens(userId);
    return c.json({ ok: true, user: { id: user.id, email: user.email } });
  });

  // DELETE /admin/users/:id — delete user account
  adminRoutes.delete("/users/:id", requirePermission(PERMISSIONS.USERS_DELETE), async (c) => {
    const userId = c.req.param("id");
    const user = await store.findUserById(userId);
    if (!user) return c.json({ error: "user not found" }, 404);

    await store.revokeAllUserTokens(userId);
    await store.deleteUserAccount(userId);
    return c.json({ ok: true });
  });

  // GET /admin/roles — list all roles
  adminRoutes.get("/roles", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const roleList = await store.listRoles();
    return c.json({ roles: roleList.map((r) => ({ id: r.id, name: r.name, description: r.description })) });
  });

  // GET /admin/roles/:id/permissions — list permissions for a role
  adminRoutes.get("/roles/:id/permissions", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const roleId = Number(c.req.param("id"));
    if (isNaN(roleId)) return c.json({ error: "invalid role id" }, 400);
    const perms = await store.getRolePermissions(roleId);
    return c.json({ permissions: perms });
  });

  // POST /admin/roles/:id/permissions — assign permission to role
  adminRoutes.post("/roles/:id/permissions", requirePermission(PERMISSIONS.USERS_ASSIGN_ROLES), async (c) => {
    const roleId = Number(c.req.param("id"));
    if (isNaN(roleId)) return c.json({ error: "invalid role id" }, 400);
    const body = await c.req.json<{ permissionId?: number }>().catch(() => null);
    if (!body?.permissionId) return c.json({ error: "permissionId is required" }, 400);
    await store.assignRolePermission(roleId, body.permissionId);
    return c.json({ ok: true });
  });

  // DELETE /admin/roles/:id/permissions — unassign permission from role
  adminRoutes.delete("/roles/:id/permissions", requirePermission(PERMISSIONS.USERS_ASSIGN_ROLES), async (c) => {
    const roleId = Number(c.req.param("id"));
    if (isNaN(roleId)) return c.json({ error: "invalid role id" }, 400);
    const body = await c.req.json<{ permissionId?: number }>().catch(() => null);
    if (!body?.permissionId) return c.json({ error: "permissionId is required" }, 400);
    await store.revokeRolePermission(roleId, body.permissionId);
    return c.json({ ok: true });
  });

  // GET /admin/permissions — list all permissions
  adminRoutes.get("/permissions", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const permList = await store.listPermissions();
    return c.json({ permissions: permList.map((p) => ({ id: p.id, code: p.code, name: p.name, resource: p.resource, action: p.action })) });
  });

  // GET /admin/stats — system stats
  adminRoutes.get("/stats", requirePermission(PERMISSIONS.USERS_LIST), async (c) => {
    const userList = await store.listAllUsers();
    const roleList = await store.listRoles();

    return c.json({
      userCount: userList.length,
      roleCount: roleList.length,
    });
  });

  return adminRoutes;
}
