import { resolvePublicLegal } from "@/lib/server/resolve-public-legal";

export const dynamic = "force-dynamic";

export async function GET() {
  const legal = await resolvePublicLegal();
  return Response.json({ display: legal.display });
}