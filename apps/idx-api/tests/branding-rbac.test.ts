import { describe, expect, it } from "vitest";
import { buildRolePermissionPairs } from "../src/db/mongo/seed-data";
import { PERMISSIONS, ROLES } from "../src/services/permissions";

describe("branding RBAC seed", () => {
  it("assigns branding permissions only to branding_admin and super_admin", () => {
    const pairs = buildRolePermissionPairs();
    const has = (roleId: number, permissionId: number) =>
      pairs.some((pair) => pair.roleId === roleId && pair.permissionId === permissionId);

    expect(has(ROLES.BRANDING_ADMIN, 59)).toBe(true);
    expect(has(ROLES.BRANDING_ADMIN, 60)).toBe(true);
    expect(has(ROLES.SUPER_ADMIN, 59)).toBe(true);
    expect(has(ROLES.SUPER_ADMIN, 60)).toBe(true);
    expect(has(ROLES.ADMIN, 59)).toBe(false);
    expect(has(ROLES.OPERATOR, 59)).toBe(false);
    expect(has(ROLES.SECURITY_ADMIN, 59)).toBe(false);
  });

  it("defines read and manage branding permission codes", () => {
    expect(PERMISSIONS.SETTINGS_BRANDING).toBe("settings.branding");
    expect(PERMISSIONS.SETTINGS_BRANDING_READ).toBe("settings.branding.read");
  });
});