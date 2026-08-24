import type { GeneratedFile, WebSource } from "@/types";

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
  sources?: WebSource[];
}

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Use the DuckDuckGo API to search the public web, then fetch and read the most relevant result pages. Return evidence, exact source URLs, and page excerpts so the answer can cite the websites directly.",
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

function toWebSource(title: string, rawUrl: string, snippet: string): WebSource | null {
  try {
    const url = new URL(resolveSearchUrl(rawUrl));
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const domain = url.hostname.replace(/^www\./i, "");
    return {
      title: decodeHtml(title).slice(0, 240) || domain,
      url: url.toString(),
      domain,
      snippet: decodeHtml(snippet).slice(0, 320),
      faviconUrl: `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`,
    };
  } catch {
    return null;
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

type SearchCandidate = { title: string; url: string; snippet: string };

function flattenRelatedTopics(topics: unknown[], results: SearchCandidate[]) {
  for (const topic of topics) {
    if (!topic || typeof topic !== "object") continue;
    const item = topic as { FirstURL?: string; Text?: string; Topics?: unknown[] };
    if (item.FirstURL && item.Text) {
      results.push({ title: item.Text.split(" - ")[0], url: item.FirstURL, snippet: item.Text });
    }
    if (Array.isArray(item.Topics)) flattenRelatedTopics(item.Topics, results);
  }
}

function collectDuckDuckGoResults(payload: {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: unknown[];
  Results?: Array<{ FirstURL?: string; Text?: string }>;
}, maxResults: number): SearchCandidate[] {
  const candidates: SearchCandidate[] = [];

  if (payload.AbstractText && payload.AbstractURL) {
    candidates.push({
      title: payload.Heading || "DuckDuckGo result",
      url: payload.AbstractURL,
      snippet: payload.AbstractText,
    });
  }

  for (const result of payload.Results ?? []) {
    if (result.FirstURL && result.Text) {
      candidates.push({
        title: result.Text.split(" - ")[0],
        url: result.FirstURL,
        snippet: result.Text,
      });
    }
  }

  flattenRelatedTopics(payload.RelatedTopics ?? [], candidates);

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const url = resolveSearchUrl(candidate.url);
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  }).slice(0, maxResults);
}

function extractReadablePage(html: string): { title: string; text: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const text = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );

  return {
    title: titleMatch ? decodeHtml(titleMatch[1]).slice(0, 240) : "",
    text: text.slice(0, 8_000),
  };
}

async function fetchReadablePage(url: string): Promise<{ title: string; text: string } | null> {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return null;
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsedUrl.hostname)) return null;

    const response = await fetch(parsedUrl, {
      headers: {
        Accept: "text/html, text/plain;q=0.9",
        "User-Agent": "Mozilla/5.0 (compatible; Noema/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;
    return extractReadablePage((await response.text()).slice(0, 500_000));
  } catch {
    return null;
  }
}

async function enrichSearchResults(candidates: SearchCandidate[]) {
  const sources: WebSource[] = [];
  const pages: Array<{ title: string; url: string; content: string }> = [];

  await Promise.all(candidates.slice(0, 3).map(async (candidate) => {
    const source = toWebSource(candidate.title, candidate.url, candidate.snippet);
    if (!source) return;
    sources.push(source);

    const page = await fetchReadablePage(source.url);
    if (page?.text) {
      pages.push({
        title: page.title || source.title,
        url: source.url,
        content: page.text,
      });
    }
  }));

  return {
    sources: sources.sort((left, right) => candidates.findIndex((candidate) => resolveSearchUrl(candidate.url) === left.url)
      - candidates.findIndex((candidate) => resolveSearchUrl(candidate.url) === right.url)),
    pages,
  };
}

async function searchWeb(query: string, maxResults: number): Promise<AgentToolResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { content: JSON.stringify({ error: "A search query is required." }) };

  const limitedResults = Math.max(1, Math.min(maxResults || 5, 5));
  let candidates: SearchCandidate[] = [];

  try {
    const apiResponse = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(normalizedQuery)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; Noema/1.0)",
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (apiResponse.ok) {
      candidates = collectDuckDuckGoResults(
        (await apiResponse.json()) as Parameters<typeof collectDuckDuckGoResults>[0],
        limitedResults,
      );
    }
  } catch {
    // Use DuckDuckGo's HTML result page below when the JSON API is unavailable.
  }

  if (candidates.length === 0) {
    try {
      // The public API is the primary search path. The HTML endpoint keeps
      // ordinary queries useful when the API only has an instant answer.
      const htmlResponse = await fetch("https://html.duckduckgo.com/html/", {
        method: "POST",
      headers: {
        Accept: "text/html",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; Noema/1.0)",
      },
      body: new URLSearchParams({ q: normalizedQuery }).toString(),
      signal: AbortSignal.timeout(10000),
      });

      if (htmlResponse.ok) candidates = parseDuckDuckGoHtml(await htmlResponse.text(), limitedResults);
    } catch {
      // Return a structured no-results response below.
    }
  }

  const enriched = await enrichSearchResults(candidates);
  const pages = enriched.pages.map((page) => ({
    title: page.title,
    url: page.url,
    content: page.content,
  }));

  return {
    content: JSON.stringify({
      query: normalizedQuery,
      source: "DuckDuckGo API",
      results: candidates,
      pages,
      note: candidates.length > 0
        ? "Use the fetched page content as evidence. Cite the exact URL from results in the final answer."
        : "DuckDuckGo did not return results for this query. Tell the user that no result was found and ask for a more specific query.",
    }),
    sources: enriched.sources,
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
