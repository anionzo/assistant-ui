import { Hono } from "hono";
import { verifySessionToken } from "../services/jwt";
import { type AuthStore, getAuthStore } from "../db/store";
import { buildPaginationMeta, parsePaginationQuery } from "../utils/pagination";
import {
  badRequest,
  created,
  invalidToken,
  notFound,
  ok,
  okPlain,
} from "../utils/response";

type SessionPayload = {
  tenantId?: unknown;
  id?: unknown;
  title?: unknown;
  formCode?: unknown;
  formName?: unknown;
  fieldValues?: unknown;
  history?: unknown;
  decision?: unknown;
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

function countFilledFields(fieldValues: Record<string, unknown>) {
  return Object.keys(fieldValues ?? {}).filter((k) => {
    const v = fieldValues[k];
    return !(v === undefined || v === null || v === "");
  }).length;
}

function toSessionSummary(session: {
  id: string;
  tenantId: string;
  title: string;
  formCode: string;
  formName: string;
  fieldValues: Record<string, unknown>;
  decision: string;
  updatedAt: Date;
}) {
  return {
    id: session.id,
    tenantId: session.tenantId,
    title: session.title,
    formCode: session.formCode,
    formName: session.formName,
    decision: session.decision,
    fieldCount: countFilledFields(session.fieldValues),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function toSessionResponse(session: {
  id: string;
  tenantId: string;
  title: string;
  formCode: string;
  formName: string;
  fieldValues: Record<string, unknown>;
  history: Array<{ role: string; text: string }>;
  decision: string;
  updatedAt: Date;
}) {
  return {
    ...toSessionSummary(session),
    fieldValues: session.fieldValues,
    history: session.history,
  };
}

function parseHistory(value: unknown) {
  if (!Array.isArray(value)) return null;
  const history: Array<{ role: string; text: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const turn = item as Record<string, unknown>;
    if (typeof turn.role !== "string" || typeof turn.text !== "string") return null;
    history.push({ role: turn.role, text: turn.text });
  }
  return history;
}

export function createVoiceFormSessionRoutes(store: AuthStore = getAuthStore()) {
  const routes = new Hono();

  routes.get("/", async (c) => {
    const user = await requireUser(c.req.raw);
    if (!user) return invalidToken(c);
    const tenantId = c.req.query("tenantId");
    const { page, limit } = parsePaginationQuery({
      page: c.req.query("page"),
      limit: c.req.query("limit"),
    });
    const result = await store.listVoiceFormSessionsPage(user.id, tenantId, { page, limit });
    return ok(c, {
      sessions: result.items.map(toSessionSummary),
      pagination: buildPaginationMeta(result.total, result.page, result.limit),
    });
  });

  routes.post("/", async (c) => {
    const user = await requireUser(c.req.raw);
    if (!user) return invalidToken(c);
    const body = await c.req.json<SessionPayload>().catch(() => null);
    if (!body || typeof body.tenantId !== "string" || !body.tenantId.trim()) {
      return badRequest(c, "tenantId is required");
    }

    const session = await store.createVoiceFormSession({
      id: typeof body.id === "string" && body.id.trim() ? body.id.trim() : undefined,
      userId: user.id,
      tenantId: body.tenantId.trim(),
      formCode: typeof body.formCode === "string" ? body.formCode : "",
      formName: typeof body.formName === "string" ? body.formName : "",
    });

    return created(c, { session: toSessionResponse(session) });
  });

  routes.get("/:id", async (c) => {
    const user = await requireUser(c.req.raw);
    if (!user) return invalidToken(c);
    const session = await store.findVoiceFormSessionById(user.id, c.req.param("id"));
    if (!session) return notFound(c, "Session not found");
    return ok(c, { session: toSessionResponse(session) });
  });

  routes.patch("/:id", async (c) => {
    const user = await requireUser(c.req.raw);
    if (!user) return invalidToken(c);
    const body = await c.req.json<SessionPayload>().catch(() => null);
    if (!body) return badRequest(c, "Request body must be valid JSON");

    const history = body.history === undefined ? undefined : parseHistory(body.history);
    if (body.history !== undefined && !history) {
      return badRequest(c, "history must be an array of {role, text}");
    }

    const fieldValues =
      body.fieldValues === undefined
        ? undefined
        : body.fieldValues && typeof body.fieldValues === "object" && !Array.isArray(body.fieldValues)
          ? (body.fieldValues as Record<string, unknown>)
          : null;
    if (body.fieldValues !== undefined && fieldValues === null) {
      return badRequest(c, "fieldValues must be an object");
    }

    const updated = await store.updateVoiceFormSession(user.id, c.req.param("id"), {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      formCode: typeof body.formCode === "string" ? body.formCode : undefined,
      formName: typeof body.formName === "string" ? body.formName : undefined,
      fieldValues: fieldValues ?? undefined,
      history: history ?? undefined,
      decision: typeof body.decision === "string" ? body.decision : undefined,
    });

    if (!updated) return notFound(c, "Session not found");
    return ok(c, { session: toSessionResponse(updated) });
  });

  routes.delete("/:id", async (c) => {
    const user = await requireUser(c.req.raw);
    if (!user) return invalidToken(c);
    const deleted = await store.deleteVoiceFormSession(user.id, c.req.param("id"));
    if (!deleted) return notFound(c, "Session not found");
    return okPlain(c);
  });

  return routes;
}