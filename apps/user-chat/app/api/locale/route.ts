import { LOCALE_COOKIE, resolveLocale } from "@idx/i18n";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { locale?: unknown } | null;
  const locale = resolveLocale(typeof body?.locale === "string" ? body.locale : null);

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}