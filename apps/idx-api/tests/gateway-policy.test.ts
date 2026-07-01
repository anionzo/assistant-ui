import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "../src/services/permissions";
import {
  credentialForRoute,
  isSafeAudioRef,
  permissionForDocumentsRoute,
  permissionForFormsRoute,
  resolveAdminDocumentsRoute,
  resolveAdminFormsRoute,
  resolveUserRagRoute,
  validatePathSegments,
} from "../src/gateway/policy";

describe("gateway policy", () => {
  it("maps user routes to the user credential", () => {
    const chat = resolveUserRagRoute("chat.stream", "POST");
    const pipelines = resolveUserRagRoute("pipelines", "GET");
    expect(chat?.credential).toBe("user");
    expect(pipelines?.credential).toBe("user");
    expect(credentialForRoute(chat!)).toBe("user");
  });

  it("maps admin routes to the admin credential and permissions", () => {
    const upload = resolveAdminDocumentsRoute(["collections", "c1", "files"], "POST");
    const formsSearch = resolveAdminFormsRoute(["search"], "POST");

    expect(upload?.credential).toBe("admin");
    expect(upload?.permission).toBe(PERMISSIONS.DOCUMENTS_UPLOAD);
    expect(formsSearch?.permission).toBe(PERMISSIONS.FORMS_SEARCH);
    expect(credentialForRoute(upload!)).toBe("admin");
  });

  it("rejects unsupported methods and unknown admin paths", () => {
    expect(resolveUserRagRoute("chat.stream", "GET")).toBeNull();
    expect(resolveAdminDocumentsRoute(["unknown", "path"], "GET")).toBeNull();
    expect(permissionForDocumentsRoute(["../etc"], "GET")).toBeNull();
  });

  it("validates audio refs and path segments for traversal", () => {
    expect(isSafeAudioRef("audio-ref-123")).toBe(true);
    expect(isSafeAudioRef("http://evil.test/x")).toBe(false);
    expect(validatePathSegments(["collections", ".."])).toBe("invalid path segment");
  });

  it("covers forms root and nested permission mapping", () => {
    expect(permissionForFormsRoute([], "GET")).toBe(PERMISSIONS.FORMS_READ);
    expect(permissionForFormsRoute([], "POST")).toBe(PERMISSIONS.FORMS_CREATE);
    expect(resolveAdminFormsRoute([], "POST")?.upstreamPath).toBe("/forms/ingest");
    expect(resolveAdminFormsRoute(["search"], "POST")?.upstreamPath).toBe("/forms/search");
  });
});