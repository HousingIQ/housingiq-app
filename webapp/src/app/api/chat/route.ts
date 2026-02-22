import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { pipeJsonRender } from "@json-render/core";
import { getAgent, type ChatMode } from "@/lib/ai/agent";
import { auth } from "@/lib/auth";
import { chatRatelimit } from "@/lib/ai/ratelimit";

export const maxDuration = 60;

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
    mode = "chat",
    modelId,
  }: { messages: UIMessage[]; mode?: ChatMode; modelId?: string } =
    await request.json();

  const selectedAgent = getAgent(mode, modelId);
  const modelMessages = await convertToModelMessages(messages);
  const result = await selectedAgent.stream({ messages: modelMessages });

  const rawStream = result.toUIMessageStream();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(pipeJsonRender(rawStream));
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
