import { PERMISSIONS, type PermissionCode } from "../services/permissions";
import type { GatewayCredential } from "./client";

export type UserRagRoute =
  | "chat.stream"
  | "voice.stream"
  | "voice.audio"
  | "pipelines";

export type AdminRagFamily = "documents" | "forms";

export type ResolvedUserRoute = {
  route: UserRagRoute;
  upstreamPath: string;
  credential: GatewayCredential;
};

export type ResolvedUserFormsRoute = {
  upstreamPath: string;
  credential: GatewayCredential;
};

const USER_FORMS_RESERVED_SEGMENTS = new Set([
  "search",
  "voice",
  "render",
  "render_preview",
  "output",
  "ingest",
]);

export type ResolvedAdminRoute = {
  family: AdminRagFamily;
  upstreamPath: string;
  credential: GatewayCredential;
  permission: PermissionCode;
};

const USER_ROUTE_MAP: Record<UserRagRoute, { methods: string[]; upstreamPath: string }> = {
  "chat.stream": { methods: ["POST"], upstreamPath: "/chat/stream" },
  "voice.stream": { methods: ["POST"], upstreamPath: "/voice/chat/stream" },
  "voice.audio": { methods: ["GET"], upstreamPath: "/voice/audio" },
  pipelines: { methods: ["GET"], upstreamPath: "/pipelines" },
};

export function isSafePathSegment(segment: string): boolean {
  if (!segment || segment === "." || segment === "..") return false;
  if (segment.includes("/") || segment.includes("\\")) return false;
  // ModularRAG collection ids are composite: tenant:corpus:slug
  return /^[A-Za-z0-9._:-]+$/.test(segment);
}

export function validatePathSegments(segments: string[]): string | null {
  for (const segment of segments) {
    if (!isSafePathSegment(segment)) return "invalid path segment";
  }
  return null;
}

export function isSafeAudioRef(ref: string): boolean {
  if (!ref || ref.length > 512) return false;
  if (ref.includes("://") || ref.includes("..")) return false;
  return /^[A-Za-z0-9._:/-]+$/.test(ref);
}

export function resolveUserFormsRoute(
  segments: string[],
  method: string,
): ResolvedUserFormsRoute | null {
  const pathError = validatePathSegments(segments);
  if (pathError) return null;

  const verb = method.toUpperCase();

  if (segments.length === 0 && verb === "GET") {
    return { upstreamPath: "/forms", credential: "user" };
  }
  if (segments.length === 1 && segments[0] === "search" && verb === "POST") {
    return { upstreamPath: "/forms/search", credential: "user" };
  }
  if (segments.length === 1 && verb === "GET" && !USER_FORMS_RESERVED_SEGMENTS.has(segments[0])) {
    return { upstreamPath: `/forms/${segments[0]}`, credential: "user" };
  }
  if (segments.length === 2 && segments[0] === "voice" && segments[1] === "fill" && verb === "POST") {
    return { upstreamPath: "/forms/voice/fill", credential: "user" };
  }
  if (segments.length === 2 && segments[0] === "voice" && segments[1] === "draft" && verb === "POST") {
    return { upstreamPath: "/forms/voice/draft", credential: "user" };
  }
  if (segments.length === 3 && segments[0] === "voice" && segments[1] === "draft" && verb === "GET") {
    return { upstreamPath: `/forms/voice/draft/${segments[2]}`, credential: "user" };
  }
  if (segments.length === 1 && segments[0] === "render" && verb === "POST") {
    return { upstreamPath: "/forms/render", credential: "user" };
  }
  if (segments.length === 1 && segments[0] === "render_preview" && verb === "POST") {
    return { upstreamPath: "/forms/render_preview", credential: "user" };
  }
  if (segments.length === 2 && segments[0] === "output" && verb === "GET") {
    return { upstreamPath: `/forms/output/${segments[1]}`, credential: "user" };
  }

  return null;
}

export function resolveUserVoiceOutputRoute(file: string, method: string): ResolvedUserFormsRoute | null {
  if (method.toUpperCase() !== "GET") return null;
  if (!isSafePathSegment(file)) return null;
  return { upstreamPath: `/voice/output/${file}`, credential: "user" };
}

export function resolveUserRagRoute(route: UserRagRoute, method: string): ResolvedUserRoute | null {
  const spec = USER_ROUTE_MAP[route];
  if (!spec || !spec.methods.includes(method.toUpperCase())) return null;
  return {
    route,
    upstreamPath: spec.upstreamPath,
    credential: "user",
  };
}

export function permissionForDocumentsRoute(segments: string[], method: string): PermissionCode | null {
  const base = segments[0] ?? "";
  const sub = segments[1] ?? "";
  const action = segments[2] ?? "";
  const verb = method.toUpperCase();

  if (base !== "collections") {
    if (base === "chunks") return PERMISSIONS.DOCUMENTS_READ;
    return null;
  }

  if (!sub) {
    return verb === "POST" ? PERMISSIONS.COLLECTIONS_CREATE : PERMISSIONS.COLLECTIONS_READ;
  }
  if (action === "publish") return PERMISSIONS.COLLECTIONS_PUBLISH;
  if (action === "documents") {
    if (segments[4] === "reprocess") return PERMISSIONS.DOCUMENTS_REPROCESS;
    if (segments[4] === "chunks") return PERMISSIONS.DOCUMENTS_READ;
    return verb === "POST" ? PERMISSIONS.DOCUMENTS_UPLOAD : PERMISSIONS.DOCUMENTS_READ;
  }
  if (action === "files") {
    if (segments[3]) return verb === "DELETE" ? PERMISSIONS.FILES_DELETE : PERMISSIONS.FILES_READ;
    return verb === "POST" ? PERMISSIONS.DOCUMENTS_UPLOAD : PERMISSIONS.FILES_READ;
  }
  if (verb === "PATCH") return PERMISSIONS.COLLECTIONS_UPDATE;
  if (verb === "DELETE") return PERMISSIONS.COLLECTIONS_DELETE;
  return PERMISSIONS.COLLECTIONS_READ;
}

export function permissionForFormsRoute(segments: string[], method: string): PermissionCode | null {
  const verb = method.toUpperCase();
  if (segments[0] === "search") return PERMISSIONS.FORMS_SEARCH;
  if (verb === "DELETE") return PERMISSIONS.FORMS_DELETE;
  if (verb === "POST" && segments.length === 0) return PERMISSIONS.FORMS_CREATE;
  if (verb === "GET" && segments.length === 0) return PERMISSIONS.FORMS_READ;
  return PERMISSIONS.FORMS_READ;
}

export function resolveAdminDocumentsRoute(
  segments: string[],
  method: string,
): ResolvedAdminRoute | null {
  const pathError = validatePathSegments(segments);
  if (pathError) return null;

  const permission = permissionForDocumentsRoute(segments, method);
  if (!permission) return null;

  return {
    family: "documents",
    upstreamPath: `/document-processing/compat/${segments.join("/")}`,
    credential: "admin",
    permission,
  };
}

export function resolveAdminFormsRoute(
  segments: string[],
  method: string,
): ResolvedAdminRoute | null {
  const pathError = validatePathSegments(segments);
  if (pathError) return null;

  const permission = permissionForFormsRoute(segments, method);
  if (!permission) return null;

  const suffix = segments.join("/");
  let upstreamPath = "/forms";
  if (segments.length === 0) {
    upstreamPath = method.toUpperCase() === "POST" ? "/forms/ingest" : "/forms";
  } else if (suffix) {
    upstreamPath = `/forms/${suffix}`;
  }

  return {
    family: "forms",
    upstreamPath,
    credential: "admin",
    permission,
  };
}

export function credentialForRoute(resolved: ResolvedUserRoute | ResolvedAdminRoute): GatewayCredential {
  return resolved.credential;
}