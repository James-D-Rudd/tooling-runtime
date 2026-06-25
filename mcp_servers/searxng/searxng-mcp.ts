import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from 'zod/v4';

const BASE_URL = "http://localhost:8088";
const MAX_CONTENT_LENGTH = 50000;

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

server.registerTool(
  "fetch_page",
  {
    description: "Fetch a web page and return its content as JSON",
    inputSchema: z.object({ url: z.string() })
  },
  async ({ url }) => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; searxng-mcp/1.0)'
        }
      });

      if (!response.ok) {
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: `HTTP ${response.status}: ${response.statusText}` 
            })
          }]
        };
      }

      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      
      // Check content length if available
      if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: "Content exceeds 5 MB limit" 
            })
          }]
        };
      }

      const text = await response.text();
      
      // Truncate to max content length
      const truncatedContent = text.length > MAX_CONTENT_LENGTH 
        ? text.slice(0, MAX_CONTENT_LENGTH) 
        : text;

      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            url,
            status: response.status,
            contentType,
            contentLength: text.length,
            content: truncatedContent
          })
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({ 
            error: error instanceof Error ? error.message : "Unknown error fetching page" 
          })
        }]
      };
    }
  }
);


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();
