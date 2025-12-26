import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/config";

// Types for housing data
export interface HousingMetric {
    id: number;
    date: string;
    region: string;
    medianPrice: number;
    yoyChange: number;
    inventory: number;
    daysOnMarket: number;
}

export interface MacroIndicator {
    id: number;
    date: string;
    indicatorName: string;
    value: number;
}

export interface Forecast {
    id: number;
    forecastDate: string;
    targetDate: string;
    metric: string;
    predictedValue: number;
    confidenceLower: number;
    confidenceUpper: number;
}

// Query keys for cache management
export const queryKeys = {
    housingMetrics: ["housing-metrics"] as const,
    macroIndicators: ["macro-indicators"] as const,
    forecasts: ["forecasts"] as const,
    latestMetrics: ["housing-metrics", "latest"] as const,
};

// Fetch functions
async function fetchHousingMetrics(): Promise<HousingMetric[]> {
    const response = await fetch(`${API_BASE_URL}/api/metrics`);
    if (!response.ok) throw new Error("Failed to fetch housing metrics");
    return response.json();
}

async function fetchMacroIndicators(): Promise<MacroIndicator[]> {
    const response = await fetch(`${API_BASE_URL}/api/macro`);
    if (!response.ok) throw new Error("Failed to fetch macro indicators");
    return response.json();
}

async function fetchForecasts(): Promise<Forecast[]> {
    const response = await fetch(`${API_BASE_URL}/api/forecasts`);
    if (!response.ok) throw new Error("Failed to fetch forecasts");
    return response.json();
}

// Custom hooks
export function useHousingMetrics() {
    return useQuery({
        queryKey: queryKeys.housingMetrics,
        queryFn: fetchHousingMetrics,
    });
}

export function useMacroIndicators() {
    return useQuery({
        queryKey: queryKeys.macroIndicators,
        queryFn: fetchMacroIndicators,
    });
}

export function useForecasts() {
    return useQuery({
        queryKey: queryKeys.forecasts,
        queryFn: fetchForecasts,
    });
}

// Hook for latest metrics (used in dashboard cards)
export function useLatestMetrics() {
    return useQuery({
        queryKey: queryKeys.latestMetrics,
        queryFn: async () => {
            const metrics = await fetchHousingMetrics();
            // Return the most recent metric
            return metrics.sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];
        },
    });
}

// Types for dashboard API response
export interface MarketData {
    city: string;
    state: string;
    growth: number;
    risk: "Low" | "Medium" | "High";
    medianPrice: number;
    inventory: number;
    daysOnMarket: number;
}

export interface MacroIndicatorData {
    name: string;
    value: number;
    unit: string;
    change: number;
    trend: "up" | "down" | "stable";
}

export interface AlertData {
    id: string;
    type: "warning" | "info" | "success" | "danger";
    title: string;
    message: string;
    timestamp: string;
    region?: string;
}

export interface PriceTrendData {
    month: string;
    national: number;
    forecast: number | null;
}

export interface DashboardData {
    healthScore: number;
    healthScoreTrend: number;
    priceGrowth: number;
    priceGrowthTrend: number;
    inventoryLevel: string;
    inventoryChange: number;
    mortgageRate: number;
    mortgageRateTrend: number;
    topMarkets: MarketData[];
    macroIndicators: MacroIndicatorData[];
    alerts: AlertData[];
    priceTrends: PriceTrendData[];
}

// Dashboard data hook
export const queryKeysDashboard = {
    dashboard: ["dashboard"] as const,
};

async function fetchDashboardData(): Promise<DashboardData> {
    const response = await fetch(`${API_BASE_URL}/api/dashboard`);
    if (!response.ok) throw new Error("Failed to fetch dashboard data");
    return response.json();
}

export function useDashboardData() {
    return useQuery({
        queryKey: queryKeysDashboard.dashboard,
        queryFn: fetchDashboardData,
    });
}

