"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MacroIndicator {
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: "up" | "down" | "stable";
}

interface MacroIndicatorsProps {
  indicators: MacroIndicator[];
}

export function MacroIndicators({ indicators }: MacroIndicatorsProps) {
  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3" />;
      case "down":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Macro Indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {indicators.map((indicator) => (
            <div
              key={indicator.name}
              className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <p className="text-xs text-muted-foreground">{indicator.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-semibold">{indicator.value}</span>
                <span className="text-sm text-muted-foreground">
                  {indicator.unit}
                </span>
              </div>
              <div
                className={`mt-1 flex items-center gap-1 text-xs ${getTrendColor(indicator.trend)}`}
              >
                {getTrendIcon(indicator.trend)}
                <span>
                  {indicator.change > 0 ? "+" : ""}
                  {indicator.change}
                  {indicator.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
