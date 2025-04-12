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

server.tool("get-settings", "取得快一點平台上的設定", async () => {
  const settings = await quickClickConsole.getSettings();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(settings),
      },
    ],
  };
});

server.tool("list-day-offs", "列出快一點平台上的額外休息時間", async () => {
  const dayOffs = await quickClickConsole.listDayOffs();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(dayOffs),
      },
    ],
  };
});

server.tool(
  "add-day-off",
  "新增快一點平台上的額外休息時間",
  {
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("The date to add the opening special for in YYYY-MM-DD format"),
  },
  async ({ date }) => {
    await quickClickConsole.addDayOff(date);
    return {
      content: [
        {
          type: "text",
          text: `Added day off for ${date}`,
        },
      ],
    };
  }
);

server.tool(
  "delete-day-off",
  "刪除快一點平台上的額外休息時間",
  {
    id: z.number(),
  },
  async ({ id }) => {
    await quickClickConsole.deleteDayOff(id);
    return {
      content: [
        {
          type: "text",
          text: `Deleted day off for ${id}`,
        },
      ],
    };
  }
);

server.tool(
  "enable-ordering",
  "啟用快一點平台上的點餐功能",
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
