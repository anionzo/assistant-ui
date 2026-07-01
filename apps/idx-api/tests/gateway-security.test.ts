import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { SERVICE_AUTH_HEADER } from "../src/middleware/service-auth";
import { signSessionToken } from "../src/services/jwt";
import { createGatewayFixture } from "./fixtures/gateway-fixture";
import { RbacTestStore } from "./helpers/rbac-store";

const USER_KEY = "fixture-user-key";
const ADMIN_KEY = "fixture-admin-key";
const SERVICE_SECRET = "fixture-service-secret";

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    [SERVICE_AUTH_HEADER]: SERVICE_SECRET,
    ...extra,
  };
}

describe("E09-S2 gateway security", () => {
  let fixture = createGatewayFixture();
  let gatewayUrl = "";
  let store = new RbacTestStore();

  beforeEach(async () => {
    fixture = createGatewayFixture();
    gatewayUrl = await fixture.listen();
    store = new RbacTestStore();
    vi.stubEnv("MODULAR_RAG_GATEWAY_URL", gatewayUrl);
    vi.stubEnv("USER_API_KEY", USER_KEY);
    vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
    vi.stubEnv("IDX_SERVICE_SECRET", SERVICE_SECRET);
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("JWT_ACCESS_TTL", "3600");
    fixture.state.apiKeysUsed = [];
    fixture.state.requestIds = [];
  });

  afterEach(async () => {
    await fixture.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function tokenFor(userId: string, email: string, roleIds: number[]) {
    return signSessionToken({
      id: userId,
      email,
      displayName: email,
      avatarUrl: null,
      roleIds,
    });
  }

  it("rejects rag calls without a service token", async () => {
    const app = createApp(store);
    const response = await app.request("/rag/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello", conversation_id: "u:1" }),
    });

    expect(response.status).toBe(401);
    expect(fixture.state.apiKeysUsed).toEqual([]);
  });

  it("rejects invalid service tokens", async () => {
    const app = createApp(store);
    const response = await app.request("/rag/pipelines", {
      headers: serviceHeaders({ [SERVICE_AUTH_HEADER]: "wrong-secret" }),
    });

    expect(response.status).toBe(403);
    expect(fixture.state.apiKeysUsed).toEqual([]);
  });

  it("uses the user credential for user rag routes", async () => {
    const app = createApp(store);
    const response = await app.request("/rag/pipelines", {
      headers: serviceHeaders(),
    });

    expect(response.status).toBe(200);
    expect(fixture.state.apiKeysUsed).toEqual([USER_KEY]);
  });

  it("blocks user-session callers from admin rag families", async () => {
    const app = createApp(store);
    const endUser = await store.createUser({ email: "user@example.com" });
    await store.assignRole(endUser.id, 5);
    const token = await tokenFor(endUser.id, endUser.email, [5]);

    const response = await app.request("/rag/admin/documents/collections", {
      headers: serviceHeaders({ Authorization: `Bearer ${token}` }),
    });

    expect(response.status).toBe(403);
    expect(fixture.state.apiKeysUsed).toEqual([]);
  });

  it("requires admin RBAC permission before using the admin credential", async () => {
    const app = createApp(store);
    const viewer = await store.createUser({ email: "viewer@example.com" });
    await store.assignRole(viewer.id, 4);
    const viewerToken = await tokenFor(viewer.id, viewer.email, [4]);

    const denied = await app.request("/rag/admin/documents/collections/col-1/files", {
      method: "POST",
      headers: serviceHeaders({
        Authorization: `Bearer ${viewerToken}`,
        "Content-Type": "multipart/form-data; boundary=b",
      }),
      body: "--b--\r\n",
    });
    expect(denied.status).toBe(403);
    expect(fixture.state.apiKeysUsed).toEqual([]);

    const operator = await store.createUser({ email: "operator@example.com" });
    await store.assignRole(operator.id, 3);
    const operatorToken = await tokenFor(operator.id, operator.email, [3]);

    const allowed = await app.request("/rag/admin/documents/collections/col-1/files", {
      method: "POST",
      headers: serviceHeaders({
        Authorization: `Bearer ${operatorToken}`,
        "Content-Type": "multipart/form-data; boundary=b",
      }),
      body: "--b--\r\n",
    });
    expect(allowed.status).toBe(200);
    expect(fixture.state.apiKeysUsed).toEqual([ADMIN_KEY]);
  });

  it("rejects arbitrary admin paths and unsafe audio refs", async () => {
    const app = createApp(store);
    const operator = await store.createUser({ email: "operator@example.com" });
    await store.assignRole(operator.id, 3);
    const token = await tokenFor(operator.id, operator.email, [3]);

    const traversal = await app.request("/rag/admin/documents/collections/a%5Cbc", {
      headers: serviceHeaders({ Authorization: `Bearer ${token}` }),
    });
    expect(traversal.status).toBe(400);

    const unknown = await app.request("/rag/admin/documents/unknown/path", {
      headers: serviceHeaders({ Authorization: `Bearer ${token}` }),
    });
    expect(unknown.status).toBe(404);

    const unsafeAudio = await app.request("/rag/voice/audio?ref=http://evil.test/x", {
      headers: serviceHeaders(),
    });
    expect(unsafeAudio.status).toBe(400);
    expect(fixture.state.apiKeysUsed).toEqual([]);
  });

  it("rejects unauthenticated admin rag calls even with a valid service token", async () => {
    const app = createApp(store);
    const response = await app.request("/rag/admin/forms", {
      headers: serviceHeaders(),
    });

    expect(response.status).toBe(401);
    expect(fixture.state.apiKeysUsed).toEqual([]);
  });

  it("uses the user credential and forwards voice-form session for user forms routes", async () => {
    const app = createApp(store);
    const list = await app.request("/rag/forms", { headers: serviceHeaders() });
    expect(list.status).toBe(200);
    expect(fixture.state.apiKeysUsed).toEqual([USER_KEY]);

    const fill = await app.request("/rag/forms/voice/fill", {
      method: "POST",
      headers: serviceHeaders({
        "Content-Type": "application/json",
        "X-Voice-Form-Session": "vf-session-42",
        "X-Tenant-ID": "tenant-a",
      }),
      body: JSON.stringify({ text: "tôi muốn đăng ký tạm trú", session_id: "vf-session-42" }),
    });
    expect(fill.status).toBe(200);
    expect(fixture.state.apiKeysUsed).toEqual([USER_KEY, USER_KEY]);
    expect(fixture.state.voiceFormSessions).toEqual(["vf-session-42"]);
    expect(JSON.parse(fixture.state.lastFormsFillBody || "{}")).toMatchObject({
      text: "tôi muốn đăng ký tạm trú",
    });
  });

  it("streams binary voice output without corrupting the body", async () => {
    const app = createApp(store);
    const response = await app.request("/rag/voice/output/tts.wav", { headers: serviceHeaders() });
    expect(response.status).toBe(200);
    expect(fixture.state.apiKeysUsed).toEqual([USER_KEY]);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes[0]).toBe(0x52);
    expect(bytes[1]).toBe(0x49);
  });
});