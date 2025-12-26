"use client";

import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
}

export function MetricCard({
  title,
  value,
  unit,
  trend,
  trendLabel,
  icon: Icon,
  variant = "default",
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return <Minus className="h-3 w-3" />;
    return trend > 0 ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
  };

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground";
    if (variant === "danger") {
      return trend > 0 ? "text-red-500" : "text-green-500";
    }
    return trend > 0 ? "text-green-500" : "text-red-500";
  };

  const getIconColor = () => {
    switch (variant) {
      case "success":
        return "bg-green-500/10 text-green-500";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500";
      case "danger":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-blue-500/10 text-blue-500";
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{value}</span>
              {unit && (
                <span className="text-lg text-muted-foreground">{unit}</span>
              )}
            </div>
            {trend !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs",
                  getTrendColor()
                )}
              >
                {getTrendIcon()}
                <span>
                  {trend > 0 ? "+" : ""}
                  {trend}%
                </span>
                {trendLabel && (
                  <span className="text-muted-foreground">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              getIconColor()
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
