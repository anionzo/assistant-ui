import http from "node:http";
import type { AddressInfo } from "node:net";

export type GatewayFixtureState = {
  sseChunkTimestamps: number[];
  upstreamAborted: boolean;
  multipartChunkTimestamps: number[];
  multipartTotalBytes: number;
  requestIds: string[];
  apiKeysUsed: string[];
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createGatewayFixture() {
  const state: GatewayFixtureState = {
    sseChunkTimestamps: [],
    upstreamAborted: false,
    multipartChunkTimestamps: [],
    multipartTotalBytes: 0,
    requestIds: [],
    apiKeysUsed: [],
  };

  const server = http.createServer((req, res) => {
    const requestId = req.headers["x-request-id"];
    if (typeof requestId === "string") state.requestIds.push(requestId);

    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey === "string") state.apiKeysUsed.push(apiKey);

    if (req.method === "POST" && req.url === "/chat/stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });

      req.on("aborted", () => {
        state.upstreamAborted = true;
      });

      void (async () => {
        const chunks = [
          "event: token\ndata: Hel\n\n",
          "event: token\ndata: lo\n\n",
          "event: done\ndata: {}\n\n",
        ];
        const startedAt = Date.now();
        for (const chunk of chunks) {
          if (state.upstreamAborted || res.writableEnded) break;
          await delay(80);
          state.sseChunkTimestamps.push(Date.now() - startedAt);
          res.write(chunk);
        }
        if (!res.writableEnded) res.end();
      })();
      return;
    }

    if (req.method === "POST" && req.url?.startsWith("/document-processing/compat/")) {
      const startedAt = Date.now();
      let bytes = 0;

      req.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        state.multipartChunkTimestamps.push(Date.now() - startedAt);
      });

      req.on("end", () => {
        state.multipartTotalBytes = bytes;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, bytes }));
      });

      req.on("aborted", () => {
        state.upstreamAborted = true;
      });
      return;
    }

    if (req.method === "GET" && req.url === "/pipelines") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ pipelines: [] }));
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/voice/audio")) {
      res.writeHead(200, { "Content-Type": "audio/webm" });
      res.end(Buffer.from("audio"));
      return;
    }

    if (req.method === "GET" && req.url === "/gateway-error") {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "failed at http://secret-gateway.internal:8030 with key leaked-secret",
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  return {
    state,
    server,
    async listen(): Promise<string> {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address() as AddressInfo;
      return `http://127.0.0.1:${address.port}`;
    },
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}