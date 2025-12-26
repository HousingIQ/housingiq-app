"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MarketData {
  city: string;
  state: string;
  growth: number;
  risk: "Low" | "Medium" | "High";
  medianPrice: number;
  inventory: number;
  daysOnMarket: number;
}

interface TopMarketsTableProps {
  markets: MarketData[];
}

export function TopMarketsTable({ markets }: TopMarketsTableProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getRiskVariant = (risk: MarketData["risk"]) => {
    switch (risk) {
      case "Low":
        return "outline" as const;
      case "Medium":
        return "secondary" as const;
      case "High":
        return "destructive" as const;
    }
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Top Markets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Market</th>
                <th className="pb-3 font-medium">Median Price</th>
                <th className="pb-3 font-medium">YoY Growth</th>
                <th className="pb-3 font-medium">Inventory</th>
                <th className="pb-3 font-medium">DOM</th>
                <th className="pb-3 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => (
                <tr
                  key={`${market.city}-${market.state}`}
                  className="border-b last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="py-3">
                    <span className="font-medium">{market.city}</span>
                    <span className="text-muted-foreground">, {market.state}</span>
                  </td>
                  <td className="py-3">{formatPrice(market.medianPrice)}</td>
                  <td className="py-3">
                    <span
                      className={
                        market.growth >= 0 ? "text-green-500" : "text-red-500"
                      }
                    >
                      {market.growth >= 0 ? "+" : ""}
                      {market.growth}%
                    </span>
                  </td>
                  <td className="py-3">
                    {market.inventory.toLocaleString()}
                  </td>
                  <td className="py-3">{market.daysOnMarket} days</td>
                  <td className="py-3">
                    <Badge variant={getRiskVariant(market.risk)}>
                      {market.risk}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
