import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as fillPost } from "../app/api/voice-form/fill/route";
import { IDX_SERVICE_AUTH_HEADER } from "../lib/server/idx-api-rag";
import { VOICE_FORM_SESSION_HEADER } from "../lib/server/voice-form";
import { mockResolvedServerConfig } from "./helpers/resolved-config";

function textFillRequest(text: string, sessionId = "sess-1") {
  const form = new FormData();
  form.append("text", text);
  form.append("session_id", sessionId);
  form.append("field_values", JSON.stringify({}));
  form.append("history", JSON.stringify([]));

  return new Request("http://localhost:3001/api/voice-form/fill", {
    method: "POST",
    headers: { [VOICE_FORM_SESSION_HEADER]: sessionId },
    body: form,
  });
}

describe("POST /api/voice-form/fill", () => {
  beforeEach(() => {
    vi.stubEnv("IDX_API_URL", "http://localhost:4000");
    vi.stubEnv("IDX_SERVICE_SECRET", "service-secret");
    mockResolvedServerConfig();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("forwards text turns through idx-api user forms voice fill", async () => {
    const idxFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ mode: "chat", voice_prompt: "Xin chào" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", idxFetch);

    const response = await fillPost(textFillRequest("tôi muốn đăng ký tạm trú"));

    expect(response.status).toBe(200);
    expect(response.headers.get(VOICE_FORM_SESSION_HEADER)).toBe("sess-1");

    const [url, init] = idxFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/rag/forms/voice/fill");
    expect(new Headers(init.headers).get(IDX_SERVICE_AUTH_HEADER)).toBe("service-secret");
    expect(JSON.parse(String(init.body))).toMatchObject({
      text: "tôi muốn đăng ký tạm trú",
      session_id: "sess-1",
    });
    const forwarded = new Headers(init.headers);
    expect(forwarded.get("X-API-Key")).toBeNull();
    expect(forwarded.get(VOICE_FORM_SESSION_HEADER)).toBe("sess-1");
    expect(forwarded.get("X-Tenant-ID")).toBe("huit_admission_chatbot");
    expect(forwarded.get("X-Corpus-ID")).toBe("admission-chatbot-corpus");
    expect(forwarded.get("X-Chat-Pipeline")).toBe("huit_chat_multi_query_prod");
  });

  it("uses chat runtime from app_config, not process.env tenant overrides", async () => {
    mockResolvedServerConfig({
      tenantId: "tenant-from-db",
      defaultCorpusId: "corpus-from-db",
      defaultChatPipeline: "pipeline-from-db",
    });
    const idxFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ mode: "chat" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", idxFetch);

    await fillPost(textFillRequest("hello"));

    const [, init] = idxFetch.mock.calls[0] as [string, RequestInit];
    const forwarded = new Headers(init.headers);
    expect(forwarded.get("X-Tenant-ID")).toBe("tenant-from-db");
    expect(forwarded.get("X-Corpus-ID")).toBe("corpus-from-db");
    expect(forwarded.get("X-Chat-Pipeline")).toBe("pipeline-from-db");
  });

  it("rejects requests without audio or text", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const form = new FormData();
    form.append("session_id", "sess-1");
    const response = await fillPost(
      new Request("http://localhost:3001/api/voice-form/fill", { method: "POST", body: form }),
    );
    expect(response.status).toBe(400);
  });
});