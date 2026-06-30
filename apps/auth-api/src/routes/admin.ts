import { Hono } from "hono";
import { type AuthStore, getAuthStore } from "../db/store";
import { requireAuth, requirePermission } from "../middleware/auth";
import { PERMISSIONS } from "../services/permissions";

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
        avatarUrl: u.avatarUrl,
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
      user: { id: user.id, email: user.email },
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions,
    });
  });

  // GET /admin/roles — list all roles
  adminRoutes.get("/roles", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
    const roleList = await store.listRoles();
    return c.json({ roles: roleList.map((r) => ({ id: r.id, name: r.name, description: r.description })) });
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
