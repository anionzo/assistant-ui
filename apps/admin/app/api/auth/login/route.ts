import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { setAuthCookies } from "@/lib/auth/cookies";

type LoginRequest = { email?: string; password?: string };

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as LoginRequest | null;
    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    }

    const result = await authApiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: body.email, password: body.password }),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { accessToken, refreshToken, user, roles, permissions } = result.data;
    await setAuthCookies(accessToken, refreshToken);

    if (roles.length === 0) {
      return NextResponse.json({
        error: "This account does not have admin access. Contact your administrator.",
      }, { status: 403 });
    }

    return NextResponse.json({ user, roles, permissions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
