import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "../src/services/permissions";
import {
  credentialForRoute,
  isSafeAudioRef,
  permissionForDocumentsRoute,
  permissionForFormsRoute,
  resolveAdminDocumentsRoute,
  resolveAdminFormsRoute,
  resolveUserFormsRoute,
  resolveUserRagRoute,
  resolveUserVoiceOutputRoute,
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

  it("maps user forms routes to the user credential without admin permissions", () => {
    expect(resolveUserFormsRoute([], "GET")?.credential).toBe("user");
    expect(resolveUserFormsRoute(["search"], "POST")?.upstreamPath).toBe("/forms/search");
    expect(resolveUserFormsRoute(["tam-tru"], "GET")?.upstreamPath).toBe("/forms/tam-tru");
    expect(resolveUserFormsRoute(["voice", "fill"], "POST")?.upstreamPath).toBe("/forms/voice/fill");
    expect(resolveUserFormsRoute(["render_preview"], "POST")?.upstreamPath).toBe("/forms/render_preview");
    expect(resolveUserFormsRoute(["output", "doc.docx"], "GET")?.upstreamPath).toBe("/forms/output/doc.docx");
    expect(resolveUserFormsRoute([], "POST")).toBeNull();
    expect(resolveUserFormsRoute(["ingest"], "POST")).toBeNull();
    expect(resolveUserVoiceOutputRoute("tts.wav", "GET")?.upstreamPath).toBe("/voice/output/tts.wav");
  });
});