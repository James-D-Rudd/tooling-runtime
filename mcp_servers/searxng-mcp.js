import fetch from "node-fetch";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "searxng-search",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "web_search",
        description: "Search the web via SearXNG",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" }
          },
          required: ["query"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name !== "web_search") {
    throw new Error(`Unknown tool: ${name}`);
  }

  const query = args.query;

  const res = await fetch(
    `http://localhost:8088/search?q=${encodeURIComponent(query)}&format=json`
  );

  const data = await res.json();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          (data.results || []).slice(0, 5).map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.content
          })),
          null,
          2
        )
      }
    ]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
