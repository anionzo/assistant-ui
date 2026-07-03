"use client";

import { useEffect, useState } from "react";
import { hasAnyPermissionCode, hasPermissionCode, PERMISSION_CODES } from "@/lib/auth/permissions";

export type AdminMe = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
};

export function useAdminMe() {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<AdminMe>;
      })
      .then((data) => setMe(data))
      .finally(() => setLoading(false));
  }, []);

  const canManageIpAllowlist = me
    ? hasPermissionCode(me.permissions, PERMISSION_CODES.SECURITY_IP_ALLOWLIST)
    : false;
  const canManageBranding = me
    ? hasPermissionCode(me.permissions, PERMISSION_CODES.SETTINGS_BRANDING)
    : false;
  const canReadBranding = me
    ? hasAnyPermissionCode(me.permissions, [
        PERMISSION_CODES.SETTINGS_BRANDING_READ,
        PERMISSION_CODES.SETTINGS_BRANDING,
      ])
    : false;
  const canManageRuntime = me
    ? hasPermissionCode(me.permissions, PERMISSION_CODES.SETTINGS_RUNTIME)
    : false;
  const canReadRuntime = me
    ? hasAnyPermissionCode(me.permissions, [
        PERMISSION_CODES.SETTINGS_RUNTIME_READ,
        PERMISSION_CODES.SETTINGS_RUNTIME,
      ])
    : false;
  const canManageLegal = me
    ? hasPermissionCode(me.permissions, PERMISSION_CODES.SETTINGS_LEGAL)
    : false;
  const canReadLegal = me
    ? hasAnyPermissionCode(me.permissions, [
        PERMISSION_CODES.SETTINGS_LEGAL_READ,
        PERMISSION_CODES.SETTINGS_LEGAL,
      ])
    : false;

  return {
    me,
    loading,
    canManageIpAllowlist,
    canManageBranding,
    canReadBranding,
    canManageRuntime,
    canReadRuntime,
    canManageLegal,
    canReadLegal,
  };
}