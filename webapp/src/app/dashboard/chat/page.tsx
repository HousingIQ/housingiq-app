"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  SPEC_DATA_PART,
  SPEC_DATA_PART_TYPE,
  type Spec,
  type SpecDataPart,
} from "@json-render/core";
import { useJsonRenderMessage } from "@json-render/react";
import { HousingRenderer } from "@/lib/ai/render/renderer";
import type { ChatMode } from "@/lib/ai/agent";
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
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ai/providers";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { ChatStats } from "@/components/ai-elements/chat-stats";
import { Spinner } from "@/components/ui/spinner";
import {
  ChevronRight,
  Download,
  FileText,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";

const _transportBody = { mode: "chat" as ChatMode, modelId: DEFAULT_MODEL as string };

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

async function generatePdf(spec: Spec, download = false): Promise<Blob> {
  const res = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec, download, filename: "document.pdf" }),
  });
  if (!res.ok) throw new Error(`PDF generation failed: ${res.status}`);
  return res.blob();
}

function PdfPreview({ spec }: { spec: Spec }) {
  const { data: pdfUrl, isPending, error, mutate } = useMutation({
    mutationFn: async () => URL.createObjectURL(await generatePdf(spec)),
  });

  useEffect(() => { mutate(); }, [mutate]);

  const download = useMutation({
    mutationFn: () => generatePdf(spec, true),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  if (error) {
    return (
      <div className="w-full my-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error.message}
      </div>
    );
  }

  return (
    <div className="w-full my-2 space-y-2">
      <div className="rounded-lg border bg-gray-50 overflow-hidden">
        {isPending ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-2">
              <Spinner />
              <span className="text-sm text-muted-foreground">Generating PDF...</span>
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-[500px]"
            title="PDF Preview"
          />
        ) : null}
      </div>
      {pdfUrl && (
        <button
          type="button"
          onClick={() => download.mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      )}
    </div>
  );
}

const MessageParts = ({
  message,
  isLastMessage,
  isStreaming,
  chatMode,
}: {
  message: AppMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  chatMode: ChatMode;
}) => {
  const { spec, hasSpec } = useJsonRenderMessage(message.parts);

  const reasoningParts = message.parts.filter(
    (part) => part.type === "reasoning"
  );
  const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;

  const lastPart = message.parts.at(-1);
  const isReasoningStreaming =
    isLastMessage && isStreaming && lastPart?.type === "reasoning";

  const isPdf = chatMode === "pdf";
  const pdfSpec = isPdf && hasSpec && !isStreaming ? spec : null;

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

  const hasAnything = segments.length > 0 || hasSpec || pdfSpec;
  const showSpecAtEnd = hasSpec && !specInserted && !isPdf;

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
          if (!hasSpec || isPdf) return null;
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

      {pdfSpec && <PdfPreview spec={pdfSpec} />}

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
  const [chatMode, setChatMode] = useState<ChatMode>("chat");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  useEffect(() => { _transportBody.mode = chatMode; }, [chatMode]);
  useEffect(() => { _transportBody.modelId = selectedModel; }, [selectedModel]);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ mode: _transportBody.mode, modelId: _transportBody.modelId }),
      })
  );

  const { messages, sendMessage, status, stop } = useChat<AppMessage>({
    transport,
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
                      chatMode={chatMode}
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
          {chatMode === "pdf" && (
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                <FileText className="h-3 w-3" />
                PDF Mode
                <button
                  type="button"
                  onClick={() => setChatMode("chat")}
                  className="ml-0.5 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
              <span className="text-xs text-muted-foreground">
                Describe the document you want to generate
              </span>
            </div>
          )}
          <PromptInput
            onSubmit={handleSubmit}
            className="rounded-xl border shadow-xs"
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                chatMode === "pdf"
                  ? "Describe a document... e.g., 'Create a rental contract for 123 Main St, $1500/month'"
                  : "Ask about housing market trends... e.g., 'What's the price trend in Denver?'"
              }
              disabled={status === "streaming" || status === "submitted"}
            />
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionMenuItem
                      onSelect={() => setChatMode("pdf")}
                    >
                      <FileText className="mr-2 size-4" />
                      Create PDF
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      onSelect={() => setChatMode("chat")}
                    >
                      <MessageSquare className="mr-2 size-4" />
                      Housing Data
                    </PromptInputActionMenuItem>
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
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
              </PromptInputTools>
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
