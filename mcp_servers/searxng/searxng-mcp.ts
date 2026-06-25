import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from 'zod/v4';

const BASE_URL = "http://localhost:8088";

function cleanText(value) {
  if (!value || typeof value !== "string") return "";

  return value
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function sanitizeSearchResult(result) {
  if (!result || typeof result !== "object") return {};

  const title = cleanText(result.title);
  const url = cleanText(result.url);

  const snippet = cleanText(
    result.content || result.snippet || result.description || ""
  ).slice(0, 400);

  return {
    title,
    url,
    snippet
  };
}

function parseSearchResponse(input, maxResults = 10) {
  const rawResults = input.results;

  const resultsArray = Array.isArray(rawResults)
    ? rawResults
    : [];


  const results = [];
  
  for (const item of resultsArray) {
    const cleaned = sanitizeSearchResult(item);

    if (!cleaned.url || !cleaned.title) continue;

    results.push(cleaned);

    if (results.length >= maxResults) break;
  }
  console.log(results);

  return {
    results
  };
}

const server = new McpServer(
  {
    name: "searxng-search",
    version: "1.0.0",
  }
);


server.registerTool(
  "web_search",
  {
    description: "Search the web via SearXNG",
    inputSchema: z.object({ query: z.string() })
  },
  async ({ query }) => {
    const url = new URL(BASE_URL);

    url.searchParams.set("q", query);
    url.searchParams.set("language", "auto");
    url.searchParams.set("time_range", "");
    url.searchParams.set("safesearch", "0");
    url.searchParams.set("categories", "general");
    url.searchParams.set("format", "json");

    const res = await fetch(url);
    const data = await res.json();

    const cleanedResults = parseSearchResponse(data);

    return {
      content: [{ type: 'text', text:  `${JSON.stringify(cleanedResults)}`}]
    };
  }
);


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();

