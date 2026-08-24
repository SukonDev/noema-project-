export const MODEL_OPTIONS = [
  { id: "Zeta", label: "Zeta", hint: "Haiku", apiModel: "claude-haiku-4-5-20251001" },
  { id: "Alpha", label: "Alpha", hint: "Sonnet 5", apiModel: "claude-sonnet-5" },
  { id: "Beta", label: "Beta", hint: "Opus 5", apiModel: "claude-opus-5" },
  { id: "Gamma", label: "Gamma", hint: "Fable 5", apiModel: "claude-fable-5" },
] as const;

export type ChatModelId = (typeof MODEL_OPTIONS)[number]["id"];

export function getApiModel(modelId: string): string {
  return MODEL_OPTIONS.find((model) => model.id === modelId)?.apiModel ?? MODEL_OPTIONS[0].apiModel;
}
