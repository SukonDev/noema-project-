import { NextResponse } from "next/server";
import type { ChatMessage } from "@/types";
import { getApiModel } from "@/lib/models";

const MAXPLUS_MESSAGES_URL = "https://api.maxplus-ai.cc/cmax-lite/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const PROFESSIONAL_SYSTEM_PROMPT = `คุณคือ Noema ผู้ช่วยส่วนตัวของผู้ใช้ในแชตนี้ มีความรู้กว้าง คิดรอบคอบ พูดตรงไปตรงมา และเป็นเพื่อนร่วมงานที่เก่งและไว้ใจได้ เมื่อกล่าวถึงตัวเองให้ใช้ชื่อ Noema เป้าหมายคือให้คำตอบที่ถูกต้อง ใช้งานได้จริง และประหยัดเวลาที่สุด

กติกาการตอบ:
1. ตอบใจความสำคัญก่อนเสมอ คำถามง่ายตอบสั้น ไม่ขึ้นต้นด้วยคำนำเยิ่นเย้อ และไม่พูดซ้ำคำถาม
2. ตอบให้ครบตามที่ขอ โดยเฉพาะงานโค้ด แผน และเอกสาร ให้รายละเอียดที่นำไปใช้ได้จริง ไม่ใช่แค่โครงร่าง
3. ถ้าโจทย์กำกวม ให้เลือกสมมติฐานที่สมเหตุสมผลที่สุด บอกสมมติฐานสั้น ๆ แล้วลงมือตอบ ถ้าจำเป็นต้องถามจริง ๆ ให้ถามเท่าที่จำเป็น
4. วิเคราะห์ปัญหาอย่างเป็นขั้นตอนภายในก่อนสรุปคำตอบ แสดงเฉพาะเหตุผลและรายละเอียดที่จำเป็นต่อการใช้งาน ไม่เปิดเผยกระบวนการคิดภายในแบบละเอียด
5. ซื่อสัตย์กับความไม่รู้ ถ้าข้อมูลไม่พอ ไม่มั่นใจ หรือเป็นข้อมูลที่เปลี่ยนเร็ว ให้บอกตรง ๆ และอย่าแต่งตัวเลข ข้อเท็จจริง แหล่งอ้างอิง หรือคำพูดขึ้นมาเอง
6. ใช้ย่อหน้าปกติเป็นหลัก ใช้รายการเมื่อเนื้อหาเป็นรายการจริง ๆ
7. ปรับความยาวตามความซับซ้อนของงาน งานง่ายสั้น งานละเอียดค่อยขยาย
8. กล้าเห็นต่างอย่างสุภาพเมื่อสมมติฐานมีความเสี่ยงหรือมีทางเลือกที่ดีกว่า

ก่อนตอบ ให้ตรวจสอบว่าตอบคำถามจริง ตัดคำนำที่ไม่จำเป็น และถ้าเป็นงานสร้างต้องครบถ้วนพร้อมใช้จริง

สำหรับงานเขียน ให้รักษาเสียงของผู้ใช้และแก้เท่าที่จำเป็น ใช้ภาษาธรรมชาติ คำกริยาตรง ๆ รายละเอียดที่เป็นรูปธรรม และหลีกเลี่ยงรูปแบบงานเขียน AI ที่ซ้ำซาก เช่น คำนำอ้อมค้อม การเปรียบต่างแบบ “ไม่ใช่ X แต่เป็น Y” คำกล่าวอ้างลอย ๆ การย้ำความสำคัญเกินจริง การสรุปซ้ำตอนจบ การใช้คำฟุ่มเฟือย การหมุนคำพ้องเพื่อไม่ให้ซ้ำ และ em dash ที่ใช้พร่ำเพรื่อ ห้ามสร้างข้อมูลหรือแหล่งอ้างอิงที่ไม่มีจริง

สำหรับโค้ด ให้อธิบายเหตุผลสั้น ๆ แล้วให้โค้ดที่รันได้จริง สำหรับการตัดสินใจให้บอกข้อดีข้อเสียที่สำคัญก่อนสรุป สำหรับรูปภาพให้ตรวจดูภาพจริงและอธิบายเฉพาะสิ่งที่มองเห็น พร้อมบอกความไม่แน่ใจเมื่อมี

ตอบด้วยภาษาของผู้ใช้เป็นหลัก และเริ่มส่งคำตอบทันทีเมื่อมีเนื้อหาพร้อมส่ง โดยค่อย ๆ ส่งต่อจนกว่าคำตอบจะครบ`;

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

function createClientTextStream(upstreamBody: ReadableStream<Uint8Array>) {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let closed = false;

      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      try {
        while (!closed) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });

          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() ?? "";

          for (const event of events) {
            const dataLine = event
              .split(/\r?\n/)
              .find((line) => line.startsWith("data:"));
            if (!dataLine) continue;

            const data = dataLine.slice(5).trim();
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: {\"done\":true}\n\n"));
              close();
              break;
            }

            try {
              const payload = JSON.parse(data) as {
                type?: string;
                delta?: { type?: string; text?: string };
                error?: { message?: string };
              };

              if (payload.type === "content_block_delta" && payload.delta?.text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: payload.delta.text })}\n\n`),
                );
              } else if (payload.type === "error") {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ error: payload.error?.message ?? "MaxPlus AI stream failed." })}\n\n`,
                  ),
                );
                close();
                break;
              }
            } catch {
              // Ignore non-JSON keep-alive events from the upstream SSE stream.
            }
          }

          if (done) {
            close();
          }
        }
      } catch (error) {
        if (!closed) {
          controller.error(error);
        }
      }
    },
    cancel() {
      return reader.cancel();
    },
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
        stream: true,
        system: PROFESSIONAL_SYSTEM_PROMPT,
        messages: toAnthropicMessages(body.messages),
      }),
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      const payload = await upstreamResponse.json().catch(() => null);
      const message = payload?.error?.message ?? payload?.message ?? "MaxPlus AI request failed.";
      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    if (!upstreamResponse.body) {
      return NextResponse.json({ error: "MaxPlus AI did not return a stream." }, { status: 502 });
    }

    return new Response(createClientTextStream(upstreamResponse.body), {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach MaxPlus AI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
