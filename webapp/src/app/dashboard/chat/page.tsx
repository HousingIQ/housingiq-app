"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useMemo, useRef, useState } from "react";
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
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
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
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ai/providers";

const MessageParts = ({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
}) => {
  const reasoningParts = message.parts.filter(
    (part) => part.type === "reasoning"
  );
  const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;

  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  return (
    <>
      {hasReasoning && (
        <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      )}
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <MessageResponse key={`${message.id}-${i}`}>
              {part.text}
            </MessageResponse>
          );
        }
        return null;
      })}
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
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest(request) {
        return {
          body: {
            messages: request.messages,
            selectedChatModel: selectedModelRef.current,
            ...request.body,
          },
        };
      },
    }),
  });

  const isStreaming = status === "streaming";

  // Accumulate token usage from assistant message metadata
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
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Chat</h1>
            <p className="text-sm text-gray-500">
              Ask questions about housing market trends and data
            </p>
          </div>
        </div>
        {/* Stats bar */}
        <div className="mt-2">
          <ChatStats
            sessionTokenUsage={sessionTokenUsage}
            messageCount={messageCount}
          />
        </div>
      </div>

      {/* Messages */}
      <Conversation className="flex-1">
        <ConversationContent className="max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Welcome to HousingIQ Chat"
              description="Ask me about home values, market trends, or housing data."
            />
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

      {/* Input */}
      <div className="border-t bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            onSubmit={handleSubmit}
            className="rounded-xl border shadow-xs"
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about housing market trends..."
              disabled={status === "streaming" || status === "submitted"}
            />
            <PromptInputFooter>
              <PromptInputSelect
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <PromptInputSelectTrigger className="w-auto gap-1 text-xs">
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <PromptInputSelectItem key={model.id} value={model.id}>
                      {model.label}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
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
