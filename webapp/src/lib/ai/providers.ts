import { gateway } from "@ai-sdk/gateway";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";

export const AVAILABLE_MODELS = [
  { id: "google/gemini-3-flash", label: "Gemini 3 Flash" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "anthropic/claude-3.7-sonnet-thinking", label: "Claude 3.7 Sonnet" },
  // { id: "openai/gpt-5.2", label: "GPT 5.2" },
] as const;

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;

export function isReasoningModel(modelId: string): boolean {
  return modelId.includes("reasoning") || modelId.endsWith("-thinking");
}

type JSONValue = null | string | number | boolean | JSONValue[] | { [key: string]: JSONValue | undefined };
type ProviderOptions = Record<string, { [key: string]: JSONValue | undefined }>;

export function getProviderOptions(modelId: string): ProviderOptions | undefined {
  if (isReasoningModel(modelId) && modelId.startsWith("anthropic/")) {
    return {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 5_000 },
      },
    };
  }

  if (modelId.startsWith("google/")) {
    return {
      google: {
        thinkingConfig: {
          thinkingLevel: "low",
          includeThoughts: true,
        },
      },
    };
  }

  if (modelId.startsWith("openai/")) {
    return {
      openai: {
        reasoningSummary: "auto",
      },
    };
  }

  return undefined;
}

export function getLanguageModel(modelId?: string) {
  const id = modelId ?? DEFAULT_MODEL;

  if (isReasoningModel(id)) {
    const gatewayModelId = id.replace(/-thinking$/, "");
    return wrapLanguageModel({
      model: gateway.languageModel(gatewayModelId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return gateway.languageModel(id);
}
