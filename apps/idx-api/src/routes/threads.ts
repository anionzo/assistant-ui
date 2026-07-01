import { Hono } from "hono";
import { verifySessionToken } from "../services/jwt";
import {
  type AuthStore,
  type StoredThreadMessage,
  getAuthStore,
} from "../db/store";
import { ErrorCode } from "../utils/errors";
import { buildPaginationMeta, parsePaginationQuery } from "../utils/pagination";
import {
  badRequest,
  created,
  invalidToken,
  notFound,
  ok,
  okPlain,
  unauthorized,
} from "../utils/response";

type ThreadPayload = {
  tenantId?: unknown;
  title?: unknown;
  conversationId?: unknown;
  archived?: unknown;
};

type MessageRepositoryPayload = {
  headId?: unknown;
  messages?: unknown;
};

function getBearerToken(authorization: string | undefined) {
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
}

async function requireUser(request: Request) {
  const token = getBearerToken(request.headers.get("authorization") ?? undefined);
  if (!token) return null;
  return verifySessionToken(token).catch(() => null);
}

function toThreadResponse(thread: {
  id: string;
  title: string;
  conversationId: string;
  tenantId: string;
  updatedAt: Date;
  archivedAt: Date | null;
}) {
  return {
    id: thread.id,
    title: thread.title,
    conversationId: thread.conversationId,
    tenantId: thread.tenantId,
    updatedAt: thread.updatedAt.toISOString(),
    archived: thread.archivedAt != null,
  };
}

function parseStoredThreadMessages(value: unknown) {
  if (!Array.isArray(value)) return null;

  const messages: StoredThreadMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;

    const record = item as Record<string, unknown>;
    if (!record.message || typeof record.message !== "object") {
      return null;
    }

    const message = record.message as Record<string, unknown>;
    const id =
      typeof record.id === "string"
        ? record.id
        : typeof message.id === "string"
          ? message.id
          : null;
    if (
      !id ||
      (record.parentId != null && typeof record.parentId !== "string") ||
      typeof message.role !== "string" ||
      (!(message.createdAt instanceof Date) &&
        typeof message.createdAt !== "string" &&
        typeof message.createdAt !== "number")
    ) {
      return null;
    }

    const createdAt = new Date(message.createdAt);
    if (Number.isNaN(createdAt.valueOf())) return null;

    messages.push({
      id,
      parentId: record.parentId ?? null,
      role: message.role,
      content: message,
      runConfig:
        record.runConfig && typeof record.runConfig === "object"
          ? (record.runConfig as Record<string, unknown>)
          : undefined,
      createdAt,
    });
  }

  return messages;
}

export function createThreadRoutes(store: AuthStore = getAuthStore()) {
  const threadRoutes = new Hono();

  const getUser = async (request: Request) => requireUser(request);

  threadRoutes.get("/", async (c) => {
    const user = await getUser(c.req.raw);
    if (!user) return invalidToken(c);
    const tenantId = c.req.query("tenantId");
    const { page, limit } = parsePaginationQuery({
      page: c.req.query("page"),
      limit: c.req.query("limit"),
    });
    const result = await store.listThreadsPage(user.id, tenantId, { page, limit });
    return ok(c, {
      threads: result.items.map(toThreadResponse),
      pagination: buildPaginationMeta(result.total, result.page, result.limit),
    });
  });

  threadRoutes.post("/", async (c) => {
    const user = await getUser(c.req.raw);
    if (!user) return invalidToken(c);
    const body = await c.req.json<ThreadPayload>().catch(() => null);
    if (!body || typeof body.tenantId !== "string" || !body.tenantId.trim()) {
      return badRequest(c, "tenantId is required");
    }

    const threadId = crypto.randomUUID();
    const thread = await store.createThread({
      userId: user.id,
      tenantId: body.tenantId.trim(),
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : "Cuộc trò chuyện mới",
      conversationId:
        typeof body.conversationId === "string" && body.conversationId.trim()
          ? body.conversationId.trim()
          : `${user.id}:${threadId}`,
    });

    return created(c, { thread: toThreadResponse(thread) });
  });

  threadRoutes.get("/:id", async (c) => {
    const user = await getUser(c.req.raw);
    if (!user) return invalidToken(c);
    const thread = await store.findThreadById(user.id, c.req.param("id"));
    if (!thread) return notFound(c, "Thread not found");
    return ok(c, { thread: toThreadResponse(thread) });
  });

  threadRoutes.patch("/:id", async (c) => {
    const user = await getUser(c.req.raw);
    if (!user) return invalidToken(c);
    const body = await c.req.json<ThreadPayload>().catch(() => null);
    if (!body) return badRequest(c, "Request body must be valid JSON");

    const updated = await store.updateThread(user.id, c.req.param("id"), {
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : undefined,
      archived:
        typeof body.archived === "boolean" ? body.archived : undefined,
    });

    if (!updated) return notFound(c, "Thread not found");
    return ok(c, { thread: toThreadResponse(updated) });
  });

  threadRoutes.delete("/:id", async (c) => {
    const user = await getUser(c.req.raw);
    if (!user) return invalidToken(c);
    const deleted = await store.deleteThread(user.id, c.req.param("id"));
    if (!deleted) return notFound(c, "Thread not found");
    return okPlain(c);
  });

  threadRoutes.get("/:id/messages", async (c) => {
    const user = await getUser(c.req.raw);
    if (!user) return invalidToken(c);
    const thread = await store.findThreadById(user.id, c.req.param("id"));
    if (!thread) return notFound(c, "Thread not found");

    const messages = await store.listThreadMessages(user.id, thread.id);
    return ok(c, {
      headId: thread.headMessageId,
      messages: messages.map((message) => ({
        parentId: message.parentId,
        message: message.content,
        ...(message.runConfig ? { runConfig: message.runConfig } : {}),
      })),
    });
  });

  threadRoutes.put("/:id/messages", async (c) => {
    const user = await getUser(c.req.raw);
    if (!user) return invalidToken(c);
    const body = await c.req.json<MessageRepositoryPayload>().catch(() => null);
    if (!body) return badRequest(c, "Request body must be valid JSON");

    const messages = parseStoredThreadMessages(body.messages);
    if (!messages) {
      return badRequest(c, "messages must be a valid assistant-ui repository");
    }

    const thread = await store.findThreadById(user.id, c.req.param("id"));
    if (!thread) return notFound(c, "Thread not found");

    const count = await store.replaceThreadMessages(user.id, thread.id, {
      headMessageId:
        body.headId === null || typeof body.headId === "string"
          ? body.headId
          : undefined,
      messages,
    });

    return ok(c, { count });
  });

  return threadRoutes;
}
