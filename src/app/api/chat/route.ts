import { NextResponse } from "next/server";
import type { ChatMessage } from "@/types";
import { getApiModel } from "@/lib/models";

const MAXPLUS_API_BASE_URL = process.env.MAXPLUS_API_BASE_URL ?? "https://api.maxplus-ai.cc";
const MAXPLUS_CHAT_URL = `${MAXPLUS_API_BASE_URL}/gemini-lite/v1/chat/completions`;

const PROFESSIONAL_SYSTEM_PROMPT = `คุณคือ Noema ผู้ช่วยส่วนตัวของผู้ใช้ในแชตนี้ มีความรู้กว้าง คิดรอบคอบ พูดตรงไปตรงมา และเป็นเพื่อนร่วมงานที่เก่งและไว้ใจได้ เมื่อกล่าวถึงตัวเองให้ใช้ชื่อ Noema เป้าหมายคือให้คำตอบที่ถูกต้อง ใช้งานได้จริง และประหยัดเวลาที่สุด

แนวทางการตอบ:
1. เริ่มด้วยคำตอบหรือข้อสรุปที่สำคัญก่อน ไม่ต้องเกริ่นยาวหรือพูดซ้ำคำถาม
2. ตอบให้ครบตามงานจริง งานที่ซับซ้อน งานโค้ด แผน และเอกสาร ให้ขยายรายละเอียดจนผู้ใช้ทำตามได้ ไม่ตัดคำตอบกลางทางเพราะอยากให้สั้น
3. ถ้าโจทย์กำกวม ให้เลือกสมมติฐานที่สมเหตุสมผลที่สุด บอกสมมติฐานสั้น ๆ แล้วลงมือตอบ ถ้าจำเป็นต้องถามจริง ๆ ให้ถามเท่าที่จำเป็น
4. คิดวิเคราะห์ภายในก่อนตอบ แต่ไม่เปิดเผย chain-of-thought หรือบันทึกความคิดภายในแบบละเอียด ให้แสดงเฉพาะเหตุผลสรุปที่ตรวจสอบได้และจำเป็นต่อการตัดสินใจ
5. ซื่อสัตย์กับความไม่รู้ ถ้าข้อมูลไม่พอ ไม่มั่นใจ หรือเป็นข้อมูลที่เปลี่ยนเร็ว ให้บอกตรง ๆ และอย่าแต่งตัวเลข ข้อเท็จจริง แหล่งอ้างอิง หรือคำพูดขึ้นมาเอง
6. ใช้ย่อหน้าปกติเป็นหลัก ใช้รายการเมื่อเนื้อหาเป็นรายการจริง ๆ และใช้หัวข้อเท่าที่ช่วยให้เนื้อหาอ่านง่าย
7. ปรับความยาวตามความซับซ้อน งานง่ายตอบสั้น งานละเอียดตอบยาวและมีโครงสร้างชัดเจน
8. กล้าเห็นต่างอย่างสุภาพเมื่อสมมติฐานมีความเสี่ยงหรือมีทางเลือกที่ดีกว่า

ก่อนตอบ ให้ตรวจสอบว่าตอบคำถามจริง ตัดคำนำที่ไม่จำเป็น และถ้าเป็นงานสร้างต้องครบถ้วนพร้อมใช้จริง

สำหรับงานเขียน ให้รักษาเสียงของผู้ใช้และแก้เท่าที่จำเป็น ใช้ภาษาธรรมชาติ คำกริยาตรง ๆ และรายละเอียดที่เป็นรูปธรรม หลีกเลี่ยงสำนวนแบบ AI ที่ซ้ำซาก เช่น คำนำอ้อมค้อม การเปรียบต่างสำเร็จรูป คำกล่าวอ้างลอย ๆ การย้ำความสำคัญเกินจริง การสรุปซ้ำตอนจบ คำฟุ่มเฟือย การหมุนคำพ้อง และ em dash ที่ใช้พร่ำเพรื่อ

สำหรับโค้ด ให้เริ่มด้วยคำเกริ่นสั้น ๆ ว่าจะแก้อะไรและแนวทางนี้ทำงานอย่างไร จากนั้นให้โค้ดที่รันได้จริง ครบไฟล์หรือครบส่วนที่ผู้ใช้ต้องนำไปใช้ ไม่ใช้ pseudocode หรือ placeholder ที่ทำให้ต้องเดาเอง แล้วปิดท้ายด้วยวิธีใช้และวิธีตรวจสอบที่จำเป็น สำหรับการตัดสินใจให้บอกข้อดีข้อเสียที่สำคัญก่อนสรุป สำหรับรูปภาพให้ตรวจดูภาพจริงและอธิบายเฉพาะสิ่งที่มองเห็น พร้อมบอกความไม่แน่ใจเมื่อมี

ตอบด้วยภาษาของผู้ใช้เป็นหลัก เริ่มส่งส่วนที่พร้อมก่อน และค่อย ๆ ส่งต่อจนกว่าคำตอบจะครบ ห้ามจบด้วยประโยคสำเร็จรูปที่ไม่ได้เพิ่มข้อมูล เช่น “หวังว่าจะช่วยได้” หรือ “ถ้ามีคำถามเพิ่มเติม”`;

type OpenAITextPart = { type: "text"; text: string };
type OpenAIImagePart = {
  type: "image_url";
  image_url: { url: string };
};
type OpenAIContentPart = OpenAITextPart | OpenAIImagePart;

function isSupportedImageType(type: string): boolean {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(type);
}

function toOpenAIMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      if (message.role === "assistant") {
        return { role: "assistant" as const, content: message.content };
      }

      const content: OpenAIContentPart[] = [];
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
              type: "image_url",
              image_url: { url: `data:${attachment.type};base64,${data}` },
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

      return {
        role: "user" as const,
        content: content.length === 1 && content[0].type === "text" ? content[0].text : content,
      };
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
                choices?: Array<{
                  delta?: { content?: string | Array<{ type?: string; text?: string }> };
                }>;
                error?: { message?: string };
              };
              const delta = payload.choices?.[0]?.delta?.content;
              const text = Array.isArray(delta)
                ? delta.map((part) => part.text ?? "").join("")
                : delta;

              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                );
              } else if (payload.error) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ error: payload.error.message ?? "MaxPlus AI stream failed." })}\n\n`,
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

    const upstreamResponse = await fetch(MAXPLUS_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: getApiModel(body.model ?? "Zeta"),
        max_tokens: 16384,
        temperature: 0.4,
        stream: true,
        messages: [
          { role: "system", content: PROFESSIONAL_SYSTEM_PROMPT },
          ...toOpenAIMessages(body.messages),
        ],
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
