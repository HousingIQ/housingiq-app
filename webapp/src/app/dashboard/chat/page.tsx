"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useMemo, useState } from "react";
import {
  SPEC_DATA_PART,
  SPEC_DATA_PART_TYPE,
  type SpecDataPart,
} from "@json-render/core";
import { useJsonRenderMessage } from "@json-render/react";
import { HousingRenderer } from "@/lib/ai/render/renderer";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { ChatStats } from "@/components/ai-elements/chat-stats";
import { Spinner } from "@/components/ui/spinner";
import { ChevronRight, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  {
    label: "New York, NY metro",
    prompt: "Show me the home value price trend for the New York, NY metro area",
  },
  {
    label: "Miami, FL market",
    prompt: "What's the housing market like in Miami, FL?",
  },
  {
    label: "Dallas, TX prices",
    prompt: "How have home prices changed in Dallas, TX over the past 2 years?",
  },
  {
    label: "Detroit, MI trend",
    prompt: "Show me the price trend for Detroit, MI",
  },
];

type AppDataParts = { [SPEC_DATA_PART]: SpecDataPart };
type AppMessage = UIMessage<unknown, AppDataParts>;

function ToolCallDisplay({
  toolName,
  state,
}: {
  toolName: string;
  state: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading =
    state !== "output-available" &&
    state !== "output-error" &&
    state !== "output-denied";

  const labels: Record<string, [string, string]> = {
    getHomeValueTrend: ["Looking up home value data", "Fetched home value data"],
  };

  const pair = labels[toolName];
  const label = pair ? (isLoading ? pair[0] : pair[1]) : toolName;

  return (
    <div className="text-sm group">
      <button
        type="button"
        className="flex items-center gap-1.5"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className={`text-muted-foreground ${isLoading ? "animate-pulse" : ""}`}>
          {label}
        </span>
        {!isLoading && (
          <ChevronRight
            className={`h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-all ${expanded ? "rotate-90" : ""}`}
          />
        )}
      </button>
    </div>
  );
}

const MessageParts = ({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: AppMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
}) => {
  const { spec, text, hasSpec } = useJsonRenderMessage(message.parts);

  const reasoningParts = message.parts.filter(
    (part) => part.type === "reasoning"
  );
  const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;

  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  type Segment =
    | { kind: "text"; text: string }
    | { kind: "tools"; tools: Array<{ toolCallId: string; toolName: string; state: string }> }
    | { kind: "spec" };

  const segments: Segment[] = [];
  let specInserted = false;

  for (const part of message.parts) {
    if (part.type === "text") {
      if (!part.text.trim()) continue;
      const last = segments[segments.length - 1];
      if (last?.kind === "text") {
        last.text += part.text;
      } else {
        segments.push({ kind: "text", text: part.text });
      }
    } else if (part.type.startsWith("tool-")) {
      const tp = part as { type: string; toolCallId: string; state: string };
      const last = segments[segments.length - 1];
      if (last?.kind === "tools") {
        last.tools.push({
          toolCallId: tp.toolCallId,
          toolName: tp.type.replace(/^tool-/, ""),
          state: tp.state,
        });
      } else {
        segments.push({
          kind: "tools",
          tools: [{
            toolCallId: tp.toolCallId,
            toolName: tp.type.replace(/^tool-/, ""),
            state: tp.state,
          }],
        });
      }
    } else if (part.type === SPEC_DATA_PART_TYPE && !specInserted) {
      segments.push({ kind: "spec" });
      specInserted = true;
    }
  }

  const hasAnything = segments.length > 0 || hasSpec;
  const showSpecAtEnd = hasSpec && !specInserted;

  return (
    <>
      {hasReasoning && (
        <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      )}

      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return (
            <MessageResponse key={`text-${i}`}>
              {seg.text}
            </MessageResponse>
          );
        }
        if (seg.kind === "spec") {
          if (!hasSpec) return null;
          return (
            <div key="spec" className="w-full my-2">
              <HousingRenderer spec={spec} loading={isLastMessage && isStreaming} />
            </div>
          );
        }
        return (
          <div key={`tools-${i}`} className="flex flex-col gap-1">
            {seg.tools.map((t) => (
              <ToolCallDisplay
                key={t.toolCallId}
                toolName={t.toolName}
                state={t.state}
              />
            ))}
          </div>
        );
      })}

      {showSpecAtEnd && (
        <div className="w-full my-2">
          <HousingRenderer spec={spec} loading={isLastMessage && isStreaming} />
        </div>
      )}

      {isLastMessage && isStreaming && !hasAnything && <Spinner />}
    </>
  );
};

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export default function ChatPage() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, stop } = useChat<AppMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isStreaming = status === "streaming";

  const sessionTokenUsage = useMemo<TokenUsage>(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    for (const msg of messages) {
      if (msg.role === "assistant") {
        const meta = msg.metadata as
          | { usage?: { inputTokens?: number; outputTokens?: number } }
          | undefined;
        if (meta?.usage) {
          const inp = meta.usage.inputTokens ?? 0;
          const out = meta.usage.outputTokens ?? 0;
          inputTokens += inp;
          outputTokens += out;
          totalTokens += inp + out;
        }
      }
    }

    return { inputTokens, outputTokens, totalTokens };
  }, [messages]);

  const messageCount = messages.filter((m) => m.role === "user").length;

  const handleSubmit = ({ text }: { text: string }) => {
    if (!text.trim()) return;
    sendMessage({
      role: "user",
      parts: [{ type: "text", text }],
    });
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Chat</h1>
            <p className="text-sm text-gray-500">
              Ask questions about housing market trends and data
            </p>
          </div>
        </div>
        <div className="mt-2">
          <ChatStats
            sessionTokenUsage={sessionTokenUsage}
            messageCount={messageCount}
          />
        </div>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="max-w-md space-y-4">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">Welcome to HousingIQ Chat</h3>
                  <p className="text-muted-foreground text-sm">
                    Ask me about home values, market trends, or housing data for any location.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSubmit({ text: s.prompt })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message, index) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.role === "assistant" ? (
                    <MessageParts
                      message={message}
                      isLastMessage={index === messages.length - 1}
                      isStreaming={isStreaming}
                    />
                  ) : (
                    message.parts
                      .filter((part) => part.type === "text")
                      .map((part) => part.text)
                      .join("")
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Spinner />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            onSubmit={handleSubmit}
            className="rounded-xl border shadow-xs"
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about housing market trends... e.g., 'What's the price trend in Denver?'"
              disabled={status === "streaming" || status === "submitted"}
            />
            <PromptInputFooter>
              <PromptInputSubmit
                status={status}
                onStop={stop}
                disabled={!input.trim() && !isStreaming}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
