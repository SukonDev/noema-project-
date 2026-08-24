export const MODEL_OPTIONS = [
  { id: "Zeta", label: "Zeta", hint: "เร็ว • คำถามทั่วไป", apiModel: "gemini-3.1-flash-lite" },
  { id: "Alpha", label: "Alpha", hint: "สมดุล • งานทั่วไปและโค้ด", apiModel: "gemini-3.5-flash" },
  { id: "Beta", label: "Beta", hint: "คิดลึก • โค้ดซับซ้อนและงานยาว", apiModel: "gemini-3.1-pro-preview" },
  { id: "Gamma", label: "Gamma", hint: "คุณภาพสูง • เขียนและวิเคราะห์", apiModel: "gemini-3.7-flash" },
] as const;

export type ChatModelId = (typeof MODEL_OPTIONS)[number]["id"];

export function getApiModel(modelId: string): string {
  return MODEL_OPTIONS.find((model) => model.id === modelId)?.apiModel ?? MODEL_OPTIONS[0].apiModel;
}
