import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import {
  getLanguageModel,
  getProviderOptions,
  DEFAULT_MODEL,
} from "@/lib/ai/providers";
import { auth } from "@/lib/auth";
import { chatRatelimit } from "@/lib/ai/ratelimit";

export const maxDuration = 60;

const systemPromptText = `You are a helpful housing analytics assistant for HousingIQ. You help users understand housing market trends, home values (ZHVI - Zillow Home Value Index), and market data. Keep your responses concise and informative. When discussing housing data, provide context about what the numbers mean for buyers and sellers.`;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { success, remaining, reset } = await chatRatelimit.limit(
    session.user.id,
  );

  if (!success) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        remaining,
        retryAfter: retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      },
    );
  }

  const {
    messages,
    selectedChatModel,
  }: { messages: UIMessage[]; selectedChatModel?: string } =
    await request.json();

  const modelId = selectedChatModel ?? DEFAULT_MODEL;
  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(modelId),
        system: systemPromptText,
        messages: modelMessages,
        providerOptions: getProviderOptions(modelId),
      });

      writer.merge(
        result.toUIMessageStream({
          sendReasoning: true,
          messageMetadata: ({ part }) => {
            if (part.type === "finish") {
              return {
                usage: part.totalUsage,
                model: modelId,
              };
            }
            return undefined;
          },
        }),
      );
    },
    onError: () => "Oops, an error occurred!",
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(reset),
    },
  });
}
