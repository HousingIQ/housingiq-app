'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { MarketOverviewCard } from '@/components/MarketOverviewCard';
import { PriceTrendChart } from '@/components/PriceTrendChart';
import { BedroomComparisonChart } from '@/components/BedroomComparisonChart';
import { PropertyTypeAnalysis } from '@/components/PropertyTypeAnalysis';
import { MarketHealthScore } from '@/components/MarketHealthScore';
import {
  useMarketStats,
  useMarketData,
  useTrendData,
  useRankings,
  type PlatformStats,
  type RankedMarket,
} from '@/lib/hooks/use-market';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Map,
  Building2,
  MapPin,
  Home,
  Calendar,
  Database,
  Flame,
  Thermometer,
  Snowflake,
  ArrowRight,
  BarChart3,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedRegion {
  regionId: string;
  regionName: string;
  geographyLevel: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOME_TYPES = [
  { value: 'All Homes', label: 'All Homes' },
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Multi Family', label: 'Multi Family' },
];

const TIERS = [
  { value: 'Bottom-Tier', label: 'Bottom' },
  { value: 'Mid-Tier', label: 'Mid' },
  { value: 'Top-Tier', label: 'Top' },
];

const TIME_RANGES = [
  { value: 12, label: '1Y' },
  { value: 36, label: '3Y' },
  { value: 60, label: '5Y' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(dateString: string | null): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

const GEO_ICONS: Record<string, React.ElementType> = {
  State: Map,
  Metro: Building2,
  County: MapPin,
  City: Home,
};

const GEO_COLORS: Record<string, string> = {
  State: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  Metro: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
  County: 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400',
  City: 'text-pink-600 bg-pink-50 dark:bg-pink-950 dark:text-pink-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatsBar({ stats, isLoading }: { stats: PlatformStats | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const geoLevels = ['State', 'Metro', 'County', 'City'];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {geoLevels.map((level) => {
        const Icon = GEO_ICONS[level] || Database;
        const count = stats.regionCounts[level] || 0;
        const colorClass = GEO_COLORS[level] || '';

        return (
          <div
            key={level}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4 transition-colors',
              colorClass
            )}
          >
            <div className="rounded-lg bg-white/60 p-2 dark:bg-black/20">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{count.toLocaleString()}</div>
              <div className="text-xs font-medium opacity-80">
                {level === 'Metro' ? 'Metros' : `${level}s`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DataFreshness({ stats }: { stats: PlatformStats | undefined }) {
  if (!stats) return null;

  const latestDate = stats.latestHomeValueDate || stats.latestRentValueDate;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        Data through {formatDateLong(latestDate)}
      </span>
      <span className="flex items-center gap-1.5">
        <Database className="h-3.5 w-3.5" />
        {stats.totalRegions.toLocaleString()} regions tracked
      </span>
      <span className="text-xs">Source: Zillow Research</span>
    </div>
  );
}

function MarketHealthDistribution({ stats }: { stats: PlatformStats | undefined }) {
  if (!stats?.marketHealth) return null;

  const hot = stats.marketHealth['Hot'] || 0;
  const warm = stats.marketHealth['Warm'] || 0;
  const cold = stats.marketHealth['Cold'] || 0;
  const total = hot + warm + cold;

  if (total === 0) return null;

  const items = [
    {
      label: 'Hot',
      count: hot,
      pct: ((hot / total) * 100).toFixed(0),
      icon: Flame,
      color: 'text-red-600 dark:text-red-400',
      barColor: 'bg-red-500',
      description: '>10% YoY growth',
    },
    {
      label: 'Warm',
      count: warm,
      pct: ((warm / total) * 100).toFixed(0),
      icon: Thermometer,
      color: 'text-amber-600 dark:text-amber-400',
      barColor: 'bg-amber-500',
      description: '3-10% YoY growth',
    },
    {
      label: 'Cold',
      count: cold,
      pct: ((cold / total) * 100).toFixed(0),
      icon: Snowflake,
      color: 'text-blue-600 dark:text-blue-400',
      barColor: 'bg-blue-500',
      description: '<3% YoY growth',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Market Temperature
        </CardTitle>
        <CardDescription>Distribution across all tracked markets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-4 overflow-hidden rounded-full">
          {items.map((item) => (
            <div
              key={item.label}
              className={cn('transition-all', item.barColor)}
              style={{ width: `${item.pct}%` }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="text-center">
                <div className={cn('flex items-center justify-center gap-1.5', item.color)}>
                  <Icon className="h-4 w-4" />
                  <span className="text-2xl font-bold">{item.count}</span>
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  {item.label} ({item.pct}%)
                </div>
                <div className="text-[10px] text-muted-foreground/70">{item.description}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TopMoversCard({
  title,
  description,
  icon: Icon,
  markets,
  isLoading,
  metricKey,
  metricLabel,
  onSelectRegion,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  markets: RankedMarket[] | undefined;
  isLoading: boolean;
  metricKey: 'homeValueYoyPct' | 'grossRentYieldPct';
  metricLabel: string;
  onSelectRegion: (region: SelectedRegion) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !markets || markets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>
        ) : (
          <div className="space-y-1">
            {markets.map((market, idx) => {
              const metricValue = market[metricKey];
              const isPositive = metricValue !== null && metricValue >= 0;

              return (
                <button
                  key={market.regionId}
                  onClick={() =>
                    onSelectRegion({
                      regionId: market.regionId,
                      regionName: market.displayName || market.regionName || '',
                      geographyLevel: market.geographyLevel || 'State',
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {market.displayName || market.regionName}
                    </div>
                    {market.currentHomeValue && (
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(market.currentHomeValue)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {metricValue !== null && (
                      <div
                        className={cn(
                          'flex items-center gap-1 text-sm font-semibold',
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {metricKey === 'grossRentYieldPct'
                          ? `${metricValue.toFixed(1)}%`
                          : formatPercent(metricValue)}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">{metricLabel}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);

  // Filter states
  const [homeType, setHomeType] = useState('All Homes');
  const [tier, setTier] = useState('Mid-Tier');
  const [months, setMonths] = useState(36);

  // TanStack Query hooks
  const { data: stats, isLoading: isLoadingStats } = useMarketStats();

  const { data: marketData, isLoading: isLoadingMarket } = useMarketData(
    selectedRegion?.regionId ?? null
  );

  const { data: trendData, isLoading: isLoadingTrends } = useTrendData(
    selectedRegion?.regionId ?? null,
    { homeType, tier, months }
  );

  const { data: topAppreciating, isLoading: isLoadingAppreciating } = useRankings({
    sortBy: 'homeValueYoyPct',
    order: 'desc',
    geographyLevel: 'State',
    limit: 5,
  });

  const { data: topCooling, isLoading: isLoadingCooling } = useRankings({
    sortBy: 'homeValueYoyPct',
    order: 'asc',
    geographyLevel: 'State',
    limit: 5,
  });

  const { data: topRentYield, isLoading: isLoadingYield } = useRankings({
    sortBy: 'grossRentYieldPct',
    order: 'desc',
    geographyLevel: 'Metro',
    limit: 5,
  });

  const isLoadingMovers = isLoadingAppreciating || isLoadingCooling || isLoadingYield;

  const handleRegionSelect = useCallback(
    (region: { regionId: string; regionName: string; geographyLevel: string }) => {
      setSelectedRegion({
        regionId: region.regionId,
        regionName: region.regionName,
        geographyLevel: region.geographyLevel,
      });
    },
    []
  );

  const handleClearRegion = useCallback(() => {
    setSelectedRegion(null);
  }, []);

  const hasTrendData =
    trendData && trendData.length > 0 && trendData.some((d) => d.homeValue !== null);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Housing Market Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Home values and rent trends across the United States
          </p>
        </div>
        <DataFreshness stats={stats} />
      </div>

      {/* Platform Stats */}
      <StatsBar stats={stats} isLoading={isLoadingStats} />

      {/* Location Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Label className="mb-3 block text-base font-medium">
              {selectedRegion ? (
                <span className="flex items-center gap-2">
                  Viewing:{' '}
                  <Badge variant="secondary" className="text-sm">
                    {selectedRegion.regionName}
                  </Badge>
                  <button
                    onClick={handleClearRegion}
                    className="rounded-full p-0.5 hover:bg-muted"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </span>
              ) : (
                'Explore a Market'
              )}
            </Label>
          </div>
          <LocationSearchBar onSelect={handleRegionSelect} className="max-w-2xl" />
        </CardContent>
      </Card>

      {/* ============ REGION SELECTED: Detail View ============ */}
      {selectedRegion && (
        <>
          <MarketOverviewCard data={marketData ?? null} isLoading={isLoadingMarket} />

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Home Type</Label>
                  <div className="flex gap-1">
                    {HOME_TYPES.map((type) => (
                      <Button
                        key={type.value}
                        variant={homeType === type.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setHomeType(type.value)}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Price Tier</Label>
                  <div className="flex gap-1">
                    {TIERS.map((t) => (
                      <Button
                        key={t.value}
                        variant={tier === t.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTier(t.value)}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Time Range</Label>
                  <div className="flex gap-1">
                    {TIME_RANGES.map((range) => (
                      <Button
                        key={range.value}
                        variant={months === range.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMonths(range.value)}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Trend Chart — only render when loading or data exists */}
          {(isLoadingTrends || hasTrendData) && (
            <PriceTrendChart
              data={trendData ?? []}
              regionName={selectedRegion.regionName}
              isLoading={isLoadingTrends}
              subtitle={`${homeType} • ${tier} • Last ${months} months`}
            />
          )}

          {/* No trend data for current filters */}
          {!isLoadingTrends && !hasTrendData && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No price trend data available for this combination of filters.</p>
                <p className="mt-1 text-sm">Try changing the home type, tier, or time range.</p>
              </CardContent>
            </Card>
          )}

          {/* Market Health Score */}
          {marketData && (
            <MarketHealthScore
              homeValueYoyPct={marketData.homeValueYoyPct}
              rentYoyPct={marketData.rentYoyPct}
              priceToRentRatio={marketData.priceToRentRatio}
              grossRentYieldPct={
                marketData.currentRentValue && marketData.currentHomeValue
                  ? ((marketData.currentRentValue * 12) / marketData.currentHomeValue) * 100
                  : null
              }
            />
          )}

          {/* Advanced Analysis */}
          <div className="grid gap-6 md:grid-cols-2">
            <BedroomComparisonChart regionId={selectedRegion.regionId} />
            <PropertyTypeAnalysis regionId={selectedRegion.regionId} />
          </div>
        </>
      )}

      {/* ============ NO REGION: Landing Overview ============ */}
      {!selectedRegion && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <MarketHealthDistribution stats={stats} />

            <TopMoversCard
              title="Fastest Appreciating"
              description="States with highest home value growth"
              icon={TrendingUp}
              markets={topAppreciating}
              isLoading={isLoadingMovers}
              metricKey="homeValueYoyPct"
              metricLabel="YoY"
              onSelectRegion={handleRegionSelect}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopMoversCard
              title="Cooling Markets"
              description="States with slowest home value growth"
              icon={TrendingDown}
              markets={topCooling}
              isLoading={isLoadingMovers}
              metricKey="homeValueYoyPct"
              metricLabel="YoY"
              onSelectRegion={handleRegionSelect}
            />

            <TopMoversCard
              title="Best Rent Yield"
              description="Metro areas with highest gross rent yield"
              icon={Home}
              markets={topRentYield}
              isLoading={isLoadingMovers}
              metricKey="grossRentYieldPct"
              metricLabel="Yield"
              onSelectRegion={handleRegionSelect}
            />
          </div>
        </>
      )}

      {/* About the Data */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <h3 className="mb-2 font-semibold">About the Data</h3>
          <p className="text-sm text-muted-foreground">
            <strong>ZHVI (Home Value):</strong> The Zillow Home Value Index is a smoothed, seasonally
            adjusted measure of the typical home value. It reflects values for homes in the 35th to
            65th percentile range.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>ZORI (Rent):</strong> The Zillow Observed Rent Index is a smoothed measure of the
            typical observed market rate rent across a given region.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
