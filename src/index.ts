import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

import QuickClickConsole from "./QuickClickConsole";
import config from "./config";

const app = express();
const server = new McpServer({
  name: "mcp-quickclick",
  version: "1.0.0",
});
const quickClickConsole = new QuickClickConsole({
  username: config.username,
  password: config.password,
  accountId: config.accountId,
});

server.resource("settings", "quickclick://settings", async (uri) => {
  const settings = await quickClickConsole.getSettings();
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(settings),
      },
    ],
  };
});

server.tool(
  "enable-ordering",
  {
    enabled: z.boolean(),
  },
  async ({ enabled }) => {
    await quickClickConsole.enableOrdering(enabled);
    return {
      content: [
        {
          type: "text",
          text: `Ordering ${enabled ? "enabled" : "disabled"}`,
        },
      ],
    };
  }
);

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports: { [sessionId: string]: SSEServerTransport } = {};

app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
