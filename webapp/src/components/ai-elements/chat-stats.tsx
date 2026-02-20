"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: number;
}

interface ChatStatsProps {
  sessionTokenUsage: TokenUsage;
  messageCount: number;
}

function formatTimeUntilReset(resetAt: number): string {
  const now = Date.now();
  const diff = resetAt - now;
  if (diff <= 0) return "now";
  const minutes = Math.ceil(diff / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

async function fetchRateLimit(): Promise<RateLimitInfo> {
  const res = await fetch("/api/chat/usage");
  if (!res.ok) throw new Error("Failed to fetch rate limit");
  return res.json();
}

export function ChatStats({ sessionTokenUsage, messageCount }: ChatStatsProps) {
  const [resetCountdown, setResetCountdown] = useState("");

  const { data: rateLimit } = useQuery({
    queryKey: ["chat", "usage", messageCount],
    queryFn: fetchRateLimit,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Update countdown timer
  useEffect(() => {
    if (!rateLimit?.resetAt) return;

    const update = () =>
      setResetCountdown(formatTimeUntilReset(rateLimit.resetAt));
    update();

    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [rateLimit?.resetAt]);

  const remaining = rateLimit?.remaining ?? 0;
  const limit = rateLimit?.limit ?? 20;
  const usedPercent = ((limit - remaining) / limit) * 100;

  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      {/* Token usage */}
      <div className="flex items-center gap-1.5" title="Session token usage">
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5"
          />
        </svg>
        <span>{formatTokenCount(sessionTokenUsage.totalTokens)} tokens</span>
        {sessionTokenUsage.totalTokens > 0 && (
          <span className="text-gray-400">
            ({formatTokenCount(sessionTokenUsage.inputTokens)} in /{" "}
            {formatTokenCount(sessionTokenUsage.outputTokens)} out)
          </span>
        )}
      </div>

      <div className="h-3 w-px bg-gray-200" />

      {/* Rate limit */}
      {rateLimit && (
        <div
          className="flex items-center gap-1.5"
          title={`Rate limit resets in ${resetCountdown}`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
          <span
            className={remaining <= 3 ? "text-amber-600 font-medium" : ""}
          >
            {remaining}/{limit} chats left
          </span>
          <Progress value={usedPercent} className="h-1.5 w-16" />
          {remaining < limit && (
            <span className="text-gray-400">resets {resetCountdown}</span>
          )}
        </div>
      )}
    </div>
  );
}
