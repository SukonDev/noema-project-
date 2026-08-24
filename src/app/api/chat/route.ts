import { NextResponse } from "next/server";
import type { ChatMessage } from "@/types";
import { getApiModel } from "@/lib/models";

const MAXPLUS_MESSAGES_URL = "https://api.maxplus-ai.cc/cmax-lite/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const NO_AI_SLOP_SYSTEM_PROMPT = `You are Noema, a clear-thinking assistant.

Answer the user's request directly and accurately. Preserve the user's meaning and voice when editing or rewriting. Make the minimum effective edit. Prefer concrete details, active verbs, specific examples, and natural sentence rhythm. Keep useful uncertainty, humor, bluntness, and personality when they belong to the user's voice.

Avoid generic AI writing patterns: throat-clearing openers, faux-insight setups, binary contrasts, dramatic fragments, rhetorical setups, fake-profound endings, summary-recap endings, importance puffery, unsupported claims or weasel attribution, synonym cycling, repetitive sentence shapes, decorative bold, emoji headings, and em dashes used as a default rhythm. Avoid filler and inflated words such as delve, foster, leverage, utilize, facilitate, empower, streamline, robust, cutting-edge, transformative, elevate, and game changer unless the user is quoting them or they are necessary in a proper name.

Do not invent facts, sources, numbers, examples, or opinions. If a claim needs a source and none is provided, say so. For writing edits, return the revised text first, followed by a short “What changed” section only when it helps explain the edit. For image attachments, inspect the image carefully and describe only what is visible; say when something is uncertain.`;

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicImageBlock = {
  type: "image";
  source: { type: "base64"; media_type: string; data: string };
};
type AnthropicContent = AnthropicTextBlock | AnthropicImageBlock;

function isSupportedImageType(type: string): boolean {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(type);
}

function toAnthropicMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      if (message.role === "assistant") {
        return { role: "assistant" as const, content: message.content };
      }

      const content: AnthropicContent[] = [];
      if (message.content.trim()) {
        content.push({ type: "text", text: message.content });
      }

      for (const attachment of message.attachments ?? []) {
        if (attachment.type.startsWith("image/") && attachment.base64Data) {
          if (isSupportedImageType(attachment.type)) {
            const data = attachment.base64Data.includes(",")
              ? attachment.base64Data.split(",", 2)[1]
              : attachment.base64Data;
            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: attachment.type,
                data,
              },
            });
          }
        } else if (attachment.textContent) {
          content.push({
            type: "text",
            text: `Attached text file: ${attachment.name}\n\n${attachment.textContent}`,
          });
        }
      }

      if (content.length === 0) {
        content.push({ type: "text", text: "Please inspect the attached file." });
      }

      return { role: "user" as const, content };
    });
}

export async function POST(request: Request) {
  const apiKey = process.env.MAXPLUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "MAXPLUS_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as {
      model?: string;
      messages?: ChatMessage[];
    };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "At least one message is required." }, { status: 400 });
    }

    const upstreamResponse = await fetch(MAXPLUS_MESSAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: getApiModel(body.model ?? "Zeta"),
        max_tokens: 4096,
        stream: false,
        system: NO_AI_SLOP_SYSTEM_PROMPT,
        messages: toAnthropicMessages(body.messages),
      }),
      cache: "no-store",
    });

    const payload = await upstreamResponse.json().catch(() => null);
    if (!upstreamResponse.ok) {
      const message = payload?.error?.message ?? payload?.message ?? "MaxPlus AI request failed.";
      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    const content = Array.isArray(payload?.content)
      ? payload.content
          .filter((block: { type?: string; text?: string }) => block.type === "text" && block.text)
          .map((block: { text: string }) => block.text)
          .join("\n")
      : "";

    if (!content) {
      return NextResponse.json({ error: "MaxPlus AI returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach MaxPlus AI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
