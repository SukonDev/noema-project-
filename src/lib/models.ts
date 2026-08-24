export const MODEL_OPTIONS = [
  { id: "Zeta", label: "Zeta", hint: "Fast answers", apiModel: "gemini-3.1-flash-lite" },
  { id: "Alpha", label: "Alpha", hint: "Everyday work and code", apiModel: "gemini-3.5-flash" },
  { id: "Beta", label: "Beta", hint: "Deep reasoning and long tasks", apiModel: "gemini-3.1-pro-preview" },
  { id: "Gamma", label: "Gamma", hint: "Writing and analysis", apiModel: "gemini-3.7-flash" },
] as const;

export type ChatModelId = (typeof MODEL_OPTIONS)[number]["id"];

export function getApiModel(modelId: string): string {
  return MODEL_OPTIONS.find((model) => model.id === modelId)?.apiModel ?? MODEL_OPTIONS[0].apiModel;
}
