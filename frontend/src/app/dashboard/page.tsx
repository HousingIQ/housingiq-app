"use client";

import { Activity, TrendingUp, Home, Percent, Loader2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PriceTrendsChart } from "@/components/dashboard/price-trends-chart";
import { MacroIndicators } from "@/components/dashboard/macro-indicators";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { TopMarketsTable } from "@/components/dashboard/top-markets-table";
import { useDashboardData } from "@/hooks/use-housing-data";

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-500">Failed to load dashboard data</p>
          <p className="text-muted-foreground text-sm">Please check your API connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">HousingIQ</span>
            </div>
            <nav className="flex items-center gap-6">
              <span className="text-sm text-muted-foreground">Dashboard</span>
              <span className="text-sm text-muted-foreground">Markets</span>
              <span className="text-sm text-muted-foreground">Forecasts</span>
              <div className="h-8 w-8 rounded-full bg-muted"></div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Market Overview</h1>
          <p className="text-muted-foreground">
            National housing market intelligence • Updated Dec 2024
          </p>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <MetricCard
            title="Market Health Score"
            value={data.healthScore}
            unit="/100"
            trend={data.healthScoreTrend}
            trendLabel="vs last month"
            icon={Activity}
            variant="success"
          />
          <MetricCard
            title="Price Growth YoY"
            value={data.priceGrowth}
            unit="%"
            trend={data.priceGrowthTrend}
            trendLabel="vs last month"
            icon={TrendingUp}
          />
          <MetricCard
            title="Inventory Level"
            value={data.inventoryLevel}
            trend={data.inventoryChange}
            trendLabel="vs last month"
            icon={Home}
            variant="warning"
          />
          <MetricCard
            title="30Y Mortgage Rate"
            value={data.mortgageRate}
            unit="%"
            trend={data.mortgageRateTrend}
            trendLabel="vs last week"
            icon={Percent}
            variant="danger"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-3 mb-6">
          <PriceTrendsChart data={data.priceTrends ?? []} />
          <MacroIndicators indicators={data.macroIndicators ?? []} />
        </div>

        {/* Bottom Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <TopMarketsTable markets={data.topMarkets ?? []} />
          <AlertsList alerts={data.alerts ?? []} />
        </div>
      </main>
    </div>
  );
}

