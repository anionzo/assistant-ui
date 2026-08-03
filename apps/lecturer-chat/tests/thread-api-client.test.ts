import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchThreadList,
  fetchThreadMetadata,
  loadThreadMessages,
} from "../lib/thread-api-client";

describe("thread-api-client dedupe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dedupes concurrent thread metadata fetches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        thread: {
          id: "t1",
          title: "Test",
          conversationId: "c1",
          tenantId: "tenant",
          updatedAt: "2026-01-01T00:00:00.000Z",
          archived: false,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      fetchThreadMetadata("t1"),
      fetchThreadMetadata("t1"),
    ]);

    expect(first?.id).toBe("t1");
    expect(second?.id).toBe("t1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent thread messages fetches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        headId: null,
        messages: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      loadThreadMessages("t1"),
      loadThreadMessages("t1"),
    ]);

    expect(first.messages).toEqual([]);
    expect(second.messages).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent thread list fetches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ threads: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([fetchThreadList(), fetchThreadList()]);

    expect(first.threads).toEqual([]);
    expect(second.threads).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});