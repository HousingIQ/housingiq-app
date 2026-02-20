import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  regionCounts: Record<string, number>;
  totalRegions: number;
  latestHomeValueDate: string | null;
  latestRentValueDate: string | null;
  marketHealth: Record<string, number>;
}

export interface MarketData {
  regionName: string | null;
  displayName: string | null;
  geographyLevel: string | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  homeValueMomPct: number | null;
  currentRentValue: number | null;
  rentYoyPct: number | null;
  rentMomPct: number | null;
  priceToRentRatio: number | null;
  grossRentYieldPct: number | null;
  marketClassification: string | null;
  homeValueDate: string | null;
  rentValueDate: string | null;
}

export interface TrendDataPoint {
  date: string;
  homeValue: number | null;
  momChangePct: number | null;
}

export interface RankedMarket {
  rank: number;
  regionId: string;
  regionName: string | null;
  displayName: string | null;
  geographyLevel: string | null;
  stateCode: string | null;
  stateName: string | null;
  metro: string | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  currentRentValue: number | null;
  rentYoyPct: number | null;
  priceToRentRatio: number | null;
  grossRentYieldPct: number | null;
  marketClassification: string | null;
}

interface TrendFilters {
  homeType?: string;
  tier?: string;
  months?: number;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useMarketStats() {
  return useQuery({
    queryKey: ['market', 'stats'],
    queryFn: () => fetchJson<{ data: PlatformStats }>('/api/market/stats').then((r) => r.data),
  });
}

export function useMarketData(regionId: string | null) {
  return useQuery({
    queryKey: ['market', 'overview', regionId],
    queryFn: () =>
      fetchJson<{ data: MarketData }>(`/api/market/${regionId}`).then((r) => r.data),
    enabled: !!regionId,
  });
}

export function useTrendData(regionId: string | null, filters: TrendFilters = {}) {
  const { homeType = 'All Homes', tier = 'Mid-Tier', months = 36 } = filters;

  return useQuery({
    queryKey: ['market', 'trends', regionId, homeType, tier, months],
    queryFn: () => {
      const params = new URLSearchParams({
        homeType,
        tier,
        months: months.toString(),
      });
      return fetchJson<{ data: TrendDataPoint[] }>(
        `/api/market/${regionId}/trends?${params}`
      ).then((r) => r.data);
    },
    enabled: !!regionId,
  });
}

export function useRankings(options: {
  sortBy: string;
  order: 'asc' | 'desc';
  geographyLevel: string;
  limit?: number;
}) {
  const { sortBy, order, geographyLevel, limit = 5 } = options;

  return useQuery({
    queryKey: ['market', 'rankings', sortBy, order, geographyLevel, limit],
    queryFn: () => {
      const params = new URLSearchParams({
        sortBy,
        order,
        geographyLevel,
        limit: limit.toString(),
      });
      return fetchJson<{ data: RankedMarket[] }>(`/api/market/rankings?${params}`).then(
        (r) => r.data
      );
    },
  });
}
