import { describe, expect, it } from "vitest";
import { buildRolePermissionPairs } from "../src/db/mongo/seed-data";
import { PERMISSIONS, ROLES } from "../src/services/permissions";

describe("settings RBAC seed", () => {
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

  it("assigns runtime permissions to branding_admin and super_admin", () => {
    const pairs = buildRolePermissionPairs();
    const has = (roleId: number, permissionId: number) =>
      pairs.some((pair) => pair.roleId === roleId && pair.permissionId === permissionId);

    expect(has(ROLES.BRANDING_ADMIN, 61)).toBe(true);
    expect(has(ROLES.BRANDING_ADMIN, 62)).toBe(true);
    expect(has(ROLES.SUPER_ADMIN, 61)).toBe(true);
    expect(has(ROLES.ADMIN, 61)).toBe(false);
    expect(has(ROLES.SECURITY_ADMIN, 61)).toBe(false);
  });

  it("defines read and manage runtime permission codes", () => {
    expect(PERMISSIONS.SETTINGS_RUNTIME).toBe("settings.runtime");
    expect(PERMISSIONS.SETTINGS_RUNTIME_READ).toBe("settings.runtime.read");
  });

  it("assigns legal permissions to branding_admin and super_admin", () => {
    const pairs = buildRolePermissionPairs();
    const has = (roleId: number, permissionId: number) =>
      pairs.some((pair) => pair.roleId === roleId && pair.permissionId === permissionId);

    expect(has(ROLES.BRANDING_ADMIN, 63)).toBe(true);
    expect(has(ROLES.BRANDING_ADMIN, 64)).toBe(true);
    expect(has(ROLES.SUPER_ADMIN, 63)).toBe(true);
    expect(has(ROLES.ADMIN, 63)).toBe(false);
  });

  it("defines read and manage legal permission codes", () => {
    expect(PERMISSIONS.SETTINGS_LEGAL).toBe("settings.legal");
    expect(PERMISSIONS.SETTINGS_LEGAL_READ).toBe("settings.legal.read");
  });
});