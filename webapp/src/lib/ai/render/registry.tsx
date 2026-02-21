"use client";

import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import {
  Line,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Info, Lightbulb, AlertTriangle, Star } from "lucide-react";
import { housingCatalog } from "./catalog";

export const { registry, handlers } = defineRegistry(housingCatalog, {
  components: {
    Stack: shadcnComponents.Stack,
    Card: shadcnComponents.Card,
    Grid: shadcnComponents.Grid,
    Heading: shadcnComponents.Heading,
    Separator: shadcnComponents.Separator,
    Badge: shadcnComponents.Badge,

    Text: ({ props }) => (
      <p className={props.muted ? "text-muted-foreground" : ""}>
        {props.content}
      </p>
    ),

    Metric: ({ props }) => {
      const TrendIcon =
        props.trend === "up"
          ? TrendingUp
          : props.trend === "down"
            ? TrendingDown
            : Minus;
      const trendColor =
        props.trend === "up"
          ? "text-green-500"
          : props.trend === "down"
            ? "text-red-500"
            : "text-muted-foreground";
      return (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{props.label}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{props.value}</span>
            {props.trend && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
          </div>
          {props.detail && (
            <p className="text-xs text-muted-foreground">{props.detail}</p>
          )}
        </div>
      );
    },

    LineChart: ({ props }) => {
      const rawData = props.data;
      const items: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as Record<string, unknown>)?.data)
          ? ((rawData as Record<string, unknown>).data as Array<Record<string, unknown>>)
          : [];

      if (items.length === 0) {
        return (
          <div className="text-center py-4 text-muted-foreground">
            No data available
          </div>
        );
      }

      const chartColor = props.color ?? "#2563eb";

      const formatYAxis = (value: number) => {
        if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
        return `$${value}`;
      };

      const formatTooltipValue = (value: number) => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value);
      };

      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      };

      return (
        <div className="w-full">
          {props.title && (
            <p className="text-sm font-medium mb-2">{props.title}</p>
          )}
          <div style={{ height: props.height ?? 300, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={items}
                margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis
                  dataKey={props.xKey}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={formatDate}
                  interval={items.length > 12 ? Math.ceil(items.length / 8) - 1 : undefined}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  width={65}
                />
                <Tooltip
                  formatter={(value) => [formatTooltipValue(Number(value)), "Home Value"]}
                  labelFormatter={formatDate}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--popover)",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={props.yKey}
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: chartColor }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    },

    Callout: ({ props }) => {
      const config = {
        info: {
          icon: Info,
          border: "border-l-blue-500",
          bg: "bg-blue-500/5",
          iconColor: "text-blue-500",
        },
        tip: {
          icon: Lightbulb,
          border: "border-l-emerald-500",
          bg: "bg-emerald-500/5",
          iconColor: "text-emerald-500",
        },
        warning: {
          icon: AlertTriangle,
          border: "border-l-amber-500",
          bg: "bg-amber-500/5",
          iconColor: "text-amber-500",
        },
        important: {
          icon: Star,
          border: "border-l-purple-500",
          bg: "bg-purple-500/5",
          iconColor: "text-purple-500",
        },
      }[props.type ?? "info"] ?? {
        icon: Info,
        border: "border-l-blue-500",
        bg: "bg-blue-500/5",
        iconColor: "text-blue-500",
      };
      const Icon = config.icon;
      return (
        <div className={`border-l-4 ${config.border} ${config.bg} rounded-r-lg p-4`}>
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.iconColor}`} />
            <div className="flex-1 min-w-0">
              {props.title && (
                <p className="font-semibold text-sm mb-1">{props.title}</p>
              )}
              <p className="text-sm text-muted-foreground">{props.content}</p>
            </div>
          </div>
        </div>
      );
    },
  },
});

export function Fallback({ type }: { type: string }) {
  return (
    <div className="p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
      Unknown component: {type}
    </div>
  );
}
