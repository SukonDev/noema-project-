import type { GeneratedFile } from "@/types";

export interface AgentToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentToolResult {
  content: string;
  file?: GeneratedFile;
}

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Search the public web when the user asks for current information, a source, a link, or facts that may have changed. Return concise, relevant results with title, URL, and snippet.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The focused web search query." },
          max_results: {
            type: "integer",
            minimum: 1,
            maximum: 5,
            description: "Maximum number of results to return. Default is 5.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description:
        "Create a downloadable file in the chat when the user asks for a file. Use a safe filename and include the complete file content. This does not write to the server filesystem.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "A safe filename including its extension." },
          content: { type: "string", description: "The complete UTF-8 file content." },
          mime_type: { type: "string", description: "The file MIME type, such as text/plain or text/html." },
        },
        required: ["filename", "content"],
        additionalProperties: false,
      },
    },
  },
] as const;

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function resolveSearchUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    return redirected ? decodeURIComponent(redirected) : url.toString();
  } catch {
    return rawUrl;
  }
}

function parseDuckDuckGoHtml(html: string, maxResults: number) {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const matches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

  for (let index = 0; index < matches.length && results.length < maxResults; index += 1) {
    const match = matches[index];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? html.length;
    const block = html.slice(start, end);
    const snippetMatch = /class="result__snippet"[^>]*>([\s\S]*?)(?:<\/a>|<\/div>)/i.exec(block);
    results.push({
      title: decodeHtml(match[2]),
      url: resolveSearchUrl(match[1]),
      snippet: snippetMatch ? decodeHtml(snippetMatch[1]) : "",
    });
  }

  return results;
}

function flattenRelatedTopics(topics: unknown[], results: Array<{ title: string; url: string; snippet: string }>) {
  for (const topic of topics) {
    if (!topic || typeof topic !== "object") continue;
    const item = topic as { FirstURL?: string; Text?: string; Topics?: unknown[] };
    if (item.FirstURL && item.Text) {
      results.push({ title: item.Text.split(" - ")[0], url: item.FirstURL, snippet: item.Text });
    }
    if (Array.isArray(item.Topics)) flattenRelatedTopics(item.Topics, results);
  }
}

async function searchWeb(query: string, maxResults: number): Promise<AgentToolResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { content: JSON.stringify({ error: "A search query is required." }) };

  const limitedResults = Math.max(1, Math.min(maxResults || 5, 5));
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  if (braveKey) {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(normalizedQuery)}&count=${limitedResults}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": braveKey,
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
      };
      const results = (payload.web?.results ?? []).slice(0, limitedResults).map((result) => ({
        title: result.title ?? "Untitled result",
        url: result.url ?? "",
        snippet: result.description ?? "",
      }));
      return { content: JSON.stringify({ query: normalizedQuery, results }) };
    }
  }

  const htmlResponse = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(normalizedQuery)}`,
    {
      headers: { "User-Agent": "Noema/1.0 (+https://noema.app)" },
      signal: AbortSignal.timeout(10000),
    },
  );
  const htmlResults = htmlResponse.ok
    ? parseDuckDuckGoHtml(await htmlResponse.text(), limitedResults)
    : [];

  if (htmlResults.length > 0) {
    return { content: JSON.stringify({ query: normalizedQuery, results: htmlResults }) };
  }

  const fallbackResponse = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(normalizedQuery)}&format=json&no_html=1&skip_disambig=1`,
    { signal: AbortSignal.timeout(10000) },
  );
  const fallback = fallbackResponse.ok
    ? (await fallbackResponse.json()) as {
        AbstractText?: string;
        AbstractURL?: string;
        Heading?: string;
        RelatedTopics?: unknown[];
      }
    : {};
  const fallbackResults: Array<{ title: string; url: string; snippet: string }> = [];
  if (fallback.AbstractText && fallback.AbstractURL) {
    fallbackResults.push({
      title: fallback.Heading || normalizedQuery,
      url: fallback.AbstractURL,
      snippet: fallback.AbstractText,
    });
  }
  flattenRelatedTopics(fallback.RelatedTopics ?? [], fallbackResults);

  return {
    content: JSON.stringify({
      query: normalizedQuery,
      results: fallbackResults.slice(0, limitedResults),
      note: "Search results may be limited. Verify important facts against the linked sources.",
    }),
  };
}

const MIME_TYPES: Record<string, string> = {
  css: "text/css",
  csv: "text/csv",
  html: "text/html",
  js: "text/javascript",
  json: "application/json",
  md: "text/markdown",
  mjs: "text/javascript",
  py: "text/x-python",
  ts: "text/typescript",
  tsx: "text/tsx",
  txt: "text/plain",
};

function sanitizeFilename(filename: string): string {
  const baseName = filename.trim().replace(/\\/g, "/").split("/").pop() ?? "download.txt";
  const safeName = baseName.replace(/[<>:"|?*\u0000-\u001f]/g, "_").slice(0, 120);
  return safeName || "download.txt";
}

function inferMimeType(filename: string, mimeType?: string): string {
  if (mimeType?.trim()) return mimeType.trim();
  const extension = filename.split(".").pop()?.toLowerCase() ?? "txt";
  return MIME_TYPES[extension] ?? "application/octet-stream";
}

async function createFile(args: Record<string, unknown>): Promise<AgentToolResult> {
  const filename = sanitizeFilename(typeof args.filename === "string" ? args.filename : "download.txt");
  const content = typeof args.content === "string" ? args.content : "";
  if (content.length > 2_000_000) {
    return { content: JSON.stringify({ error: "The file is larger than the 2 MB download limit." }) };
  }

  const file: GeneratedFile = {
    name: filename,
    content,
    mimeType: inferMimeType(filename, typeof args.mime_type === "string" ? args.mime_type : undefined),
  };
  return {
    file,
    content: JSON.stringify({ created: true, name: file.name, mime_type: file.mimeType, bytes: file.content.length }),
  };
}

export async function executeAgentTool(
  name: string,
  rawArguments: string,
): Promise<AgentToolResult> {
  let args: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(rawArguments || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed;
  } catch {
    return { content: JSON.stringify({ error: "The tool arguments were not valid JSON." }) };
  }

  if (name === "search_web") {
    return searchWeb(
      typeof args.query === "string" ? args.query : "",
      typeof args.max_results === "number" ? args.max_results : 5,
    );
  }
  if (name === "create_file") return createFile(args);

  return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
}
