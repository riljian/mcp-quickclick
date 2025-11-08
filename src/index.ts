import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import QuickClickConsole from "./QuickClickConsole";
import config from "./config";

const server = new McpServer({
  name: "mcp-quickclick",
  version: "1.0.0",
});
const quickClickConsole = new QuickClickConsole({
  username: config.username,
  password: config.password,
  accountId: config.accountId,
  menuId: config.menuId,
});

server.registerTool(
  "get-settings",
  {
    title: "Get platform settings",
    inputSchema: {},
    outputSchema: {
      name: z.string().describe("The name of the shop"),
      to_go_waiting_time: z
        .string()
        .describe("The to-go waiting time in minutes"),
    },
  },
  async () => {
    const settings = await quickClickConsole.getSettings();
    return {
      content: [{ type: "text", text: JSON.stringify(settings) }],
      structuredContent: settings,
    };
  }
);

server.registerTool(
  "update-to-go-waiting-time",
  {
    title: "Update to-go waiting time (in minutes)",
    inputSchema: {
      waitingTime: z.number(),
    },
    outputSchema: {
      message: z
        .string()
        .describe("The message indicating the success of the operation"),
    },
  },
  async ({ waitingTime }) => {
    await quickClickConsole.updateToGoWaitingTime(waitingTime);
    const result = {
      message: `Updated to-go waiting time to ${waitingTime}`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

server.registerTool(
  "list-day-offs",
  {
    title: "List extra day offs",
    inputSchema: {},
    outputSchema: {
      dayOffs: z.array(
        z.object({
          id: z.number(),
          specialDate: z
            .string()
            .describe("The date of the extra day off in YYYY-MM-DD format"),
        })
      ),
    },
  },
  async () => {
    const dayOffs = await quickClickConsole.listDayOffs();
    const result = { dayOffs };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

server.registerTool(
  "add-day-off",
  {
    title: "Add extra day off",
    inputSchema: {
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe(
          "The date to add the opening special for in YYYY-MM-DD format"
        ),
    },
    outputSchema: {
      message: z
        .string()
        .describe("The message indicating the success of the operation"),
    },
  },
  async ({ date }) => {
    await quickClickConsole.addDayOff(date);
    const result = { message: `Added day off for ${date}` };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

server.registerTool(
  "delete-day-off",
  {
    title: "Delete extra day off",
    inputSchema: {
      id: z.number(),
    },
    outputSchema: {
      message: z
        .string()
        .describe("The message indicating the success of the operation"),
    },
  },
  async ({ id }) => {
    await quickClickConsole.deleteDayOff(id);
    const result = { message: `Deleted day off for ${id}` };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

server.registerTool(
  "enable-ordering",
  {
    title: "Enable ordering",
    inputSchema: {
      enabled: z.boolean().describe("Whether to enable ordering"),
    },
    outputSchema: {
      message: z
        .string()
        .describe("The message indicating the success of the operation"),
    },
  },
  async ({ enabled }) => {
    await quickClickConsole.enableOrdering(enabled);
    const result = { message: `Ordering ${enabled ? "enabled" : "disabled"}` };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

server.registerTool(
  "list-products",
  {
    title: "List products",
    inputSchema: {
      name: z
        .string()
        .optional()
        .describe("The name of the product to filter by"),
    },
    outputSchema: {
      products: z.array(
        z.object({
          id: z.number(),
          price: z.number().describe("The price of the product"),
          name: z.string().describe("The name of the product"),
          isAvailable: z.boolean().describe("Whether the product is available"),
        })
      ),
    },
  },
  async ({ name }) => {
    const products = await quickClickConsole.listProducts({ name });
    const result = { products };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

server.registerTool(
  "get-product",
  {
    title: "Get product",
    inputSchema: {
      id: z.number().describe("The id of the product to get"),
    },
    outputSchema: {
      name: z.string().describe("The name of the product"),
      description: z.string().describe("The description of the product"),
      categoryId: z.number().describe("The category id of the product"),
      isAvailable: z.boolean().describe("Whether the product is available"),
    },
  },
  async ({ id }) => {
    const product = await quickClickConsole.getProduct(id);
    return {
      content: [{ type: "text", text: JSON.stringify(product) }],
      structuredContent: product,
    };
  }
);

server.registerTool(
  "create-product",
  {
    title: "Create product",
    inputSchema: {
      price: z.number().describe("The price of the product"),
      name: z.string().describe("The name of the product"),
      description: z
        .string()
        .optional()
        .describe("The description of the product"),
      isAvailable: z.boolean().describe("Whether the product is available"),
      categoryId: z.number().describe("The category id of the product"),
    },
    outputSchema: {
      message: z
        .string()
        .describe("The message indicating the success of the operation"),
    },
  },
  async ({ price, name, description, isAvailable, categoryId }) => {
    await quickClickConsole.createProduct({
      price,
      name,
      description,
      isAvailable,
      categoryId,
    });
    const result = { message: `Created product ${name}` };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

server.registerTool(
  "update-product",
  {
    title: "Update product",
    inputSchema: {
      id: z.number().describe("The id of the product to update"),
      price: z.number().optional().describe("The price of the product"),
      name: z.string().optional().describe("The name of the product"),
      description: z
        .string()
        .optional()
        .describe("The description of the product"),
      isAvailable: z
        .boolean()
        .optional()
        .describe("Whether the product is available"),
    },
    outputSchema: {
      message: z
        .string()
        .describe("The message indicating the success of the operation"),
    },
  },
  async ({ id, price, name, description, isAvailable }) => {
    const updatedProduct = await quickClickConsole.updateProduct({
      id,
      price,
      name,
      description,
      isAvailable,
    });
    const result = {
      message: `Updated product ${id} with ${JSON.stringify(updatedProduct)}`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

const app = express();

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

app.post("/mcp", express.json(), async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
