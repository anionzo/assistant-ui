"use client";

import { useEffect, useState } from "react";
import { hasPermissionCode, PERMISSION_CODES } from "@/lib/auth/permissions";

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

  return { me, loading, canManageIpAllowlist };
}