export function normalizeClientIp(ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed) return "127.0.0.1";
  if (trimmed.startsWith("::ffff:")) return trimmed.slice(7);
  if (trimmed === "::1" || trimmed === "0:0:0:0:0:0:0:1") return "127.0.0.1";
  return trimmed;
}

export function isLoopbackIp(ip: string): boolean {
  const normalized = normalizeClientIp(ip);
  return normalized === "127.0.0.1" || normalized.startsWith("127.");
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [base, prefixRaw] = cidr.split("/");
  const prefix = Number.parseInt(prefixRaw ?? "", 10);
  if (!base || Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function ipMatchesAllowlist(ip: string, entries: string[]): boolean {
  const normalized = normalizeClientIp(ip);
  if (normalized === "127.0.0.1" || normalized === "::1") return true;

  return entries.some((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return false;
    if (trimmed.includes("/")) return ipInCidr(normalized, trimmed);
    return normalized === trimmed;
  });
}