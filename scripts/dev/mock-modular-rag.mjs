import { createServer } from "node:http";

const port = Number(process.env.MOCK_GATEWAY_PORT ?? 8030);

const server = createServer((request, response) => {
  if (request.url === "/pipelines" && request.method === "GET") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ pipelines: ["huit_chat_multi_query_prod"] }));
    return;
  }

  if (request.url !== "/chat/stream" || request.method !== "POST") {
    response.writeHead(404).end();
    return;
  }

  if (!request.headers["x-api-key"]) {
    response.writeHead(401).end("missing API key");
    return;
  }

  let rawBody = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => (rawBody += chunk));
  request.on("end", () => {
    const body = JSON.parse(rawBody);
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const chunks = ["Xin chào! ", `Tôi đã nhận: ${body.message}`];
    let index = 0;
    const timer = setInterval(() => {
      if (index < chunks.length) {
        response.write(`event: token\ndata: ${JSON.stringify({ token: chunks[index++] })}\n\n`);
        return;
      }
      clearInterval(timer);
      response.end("event: done\ndata: [DONE]\n\n");
    }, 150);

    response.on("close", () => clearInterval(timer));
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock ModularRAG listening on http://127.0.0.1:${port}`);
});
