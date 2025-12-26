"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PriceTrendData {
  month: string;
  national: number;
  forecast: number | null;
}

interface PriceTrendsChartProps {
  data: PriceTrendData[];
}

export function PriceTrendsChart({ data }: PriceTrendsChartProps) {
  const formatPrice = (value: number) => {
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>National Price Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatPrice}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[(dataMin: number) => dataMin - 10000, (dataMax: number) => dataMax + 10000]}
              />
              <Tooltip
                formatter={(value) => [formatPrice(value as number), ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="national"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Forecast"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
