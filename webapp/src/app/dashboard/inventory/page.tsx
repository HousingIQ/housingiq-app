'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ArrowUpDown,
  Clock,
  Scale,
  MapPin,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { RegionComparePicker, SelectedRegion } from '@/components/RegionComparePicker';

interface InventoryTrend {
  date: string;
  formattedDate: string;
  inventoryCount: number | null;
  momChangePct: number | null;
  yoyChangePct: number | null;
}

interface InventoryStats {
  currentInventory: number | null;
  yoyChangePct: number | null;
  momChangePct: number | null;
  inventoryOneYearAgo: number | null;
}

interface RegionSummary {
  regionId: string;
  regionName: string;
  state: string | null;
  sizeRank: number | null;
  inventoryCount: number;
  yoyChangePct: number | null;
}

interface NationalTotals {
  totalInventory: number;
  avgYoyChangePct: number;
  regionCount: number;
}

const TIME_RANGES = [
  { value: 12, label: '1 Year' },
  { value: 24, label: '2 Years' },
  { value: 36, label: '3 Years' },
  { value: 60, label: '5 Years' },
];

const chartConfig: ChartConfig = {
  inventoryCount: {
    label: 'Inventory',
    color: '#3b82f6',
  },
};

// Color scale for heat map
const getHeatColor = (value: number, max: number) => {
  const ratio = value / max;
  if (ratio > 0.8) return '#ef4444'; // Red - high inventory
  if (ratio > 0.6) return '#f97316'; // Orange
  if (ratio > 0.4) return '#eab308'; // Yellow
  if (ratio > 0.2) return '#22c55e'; // Green
  return '#3b82f6'; // Blue - low inventory
};

// Estimate months of supply (rough estimate without sales data)
// Using a baseline assumption that typical market has ~6% monthly turnover
const estimateMonthsOfSupply = (inventory: number, yoyChangePct: number | null): number | null => {
  if (!inventory) return null;
  // Adjust turnover estimate based on YoY change
  // If inventory is rising fast, turnover is slower
  const baseMonthlyTurnover = 0.06; // 6% baseline
  const adjustedTurnover = yoyChangePct 
    ? baseMonthlyTurnover * (1 - (yoyChangePct / 100) * 0.5)
    : baseMonthlyTurnover;
  
  const clampedTurnover = Math.max(0.02, Math.min(0.15, adjustedTurnover));
  return 1 / clampedTurnover;
};

// Estimate days on market based on inventory trends
const estimateDaysOnMarket = (yoyChangePct: number | null, momChangePct: number | null): number | null => {
  // Base DOM is around 30 days in balanced market
  const baseDom = 30;
  
  if (yoyChangePct === null) return null;
  
  // Rising inventory = longer DOM, falling = shorter
  const yoyAdjustment = yoyChangePct * 0.5; // Each 1% YoY change = 0.5 days
  const momAdjustment = (momChangePct || 0) * 2; // MoM is more volatile, smaller weight
  
  const estimatedDom = baseDom + yoyAdjustment + momAdjustment;
  return Math.max(10, Math.min(120, Math.round(estimatedDom)));
};

// Get market health interpretation
const getMarketHealth = (monthsOfSupply: number | null): { label: string; color: string; description: string } => {
  if (monthsOfSupply === null) return { label: 'Unknown', color: 'gray', description: 'Insufficient data' };
  
  if (monthsOfSupply < 3) {
    return { label: "Extreme Seller's Market", color: 'red', description: 'Very low inventory, expect bidding wars' };
  }
  if (monthsOfSupply < 4) {
    return { label: "Seller's Market", color: 'orange', description: 'Low inventory, sellers have advantage' };
  }
  if (monthsOfSupply < 6) {
    return { label: 'Balanced', color: 'green', description: 'Healthy market conditions' };
  }
  if (monthsOfSupply < 8) {
    return { label: "Buyer's Market", color: 'blue', description: 'More inventory, buyers have leverage' };
  }
  return { label: "Strong Buyer's Market", color: 'indigo', description: 'High inventory, negotiate aggressively' };
};

export default function InventoryPage() {
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [trends, setTrends] = useState<InventoryTrend[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [nationalSummary, setNationalSummary] = useState<RegionSummary[]>([]);
  const [nationalTotals, setNationalTotals] = useState<NationalTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [months, setMonths] = useState(36);
  const [sortBy, setSortBy] = useState<'inventory' | 'change'>('inventory');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch national summary on load
  useEffect(() => {
    const fetchNational = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/market/inventory?geographyLevel=Metro&limit=50`);
        const result = await response.json();
        if (result.data) {
          setNationalSummary(result.data.summary || []);
          setNationalTotals(result.data.totals || null);
        }
      } catch (error) {
        console.error('Failed to fetch national inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNational();
  }, []);

  // Fetch region-specific data when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setTrends([]);
      setStats(null);
      return;
    }

    const fetchRegion = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/market/inventory?regionId=${selectedRegion.regionId}&months=${months}`
        );
        const result = await response.json();
        if (result.data) {
          setTrends(result.data.trends || []);
          setStats(result.data.stats || null);
        }
      } catch (error) {
        console.error('Failed to fetch region inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegion();
  }, [selectedRegion, months]);

  // Sort national summary
  const sortedSummary = [...nationalSummary].sort((a, b) => {
    const aVal = sortBy === 'inventory' ? a.inventoryCount : (a.yoyChangePct || 0);
    const bVal = sortBy === 'inventory' ? b.inventoryCount : (b.yoyChangePct || 0);
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const handleRegionSelect = (regions: SelectedRegion[]) => {
    setSelectedRegion(regions[0] || null);
  };

  const toggleSort = (field: 'inventory' | 'change') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const renderTrendIcon = (value: number | null) => {
    if (value === null) return <Minus className="h-4 w-4 text-gray-400" />;
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Computed metrics for selected region
  const monthsOfSupply = useMemo(() => {
    if (!stats?.currentInventory) return null;
    return estimateMonthsOfSupply(stats.currentInventory, stats.yoyChangePct);
  }, [stats]);

  const daysOnMarket = useMemo(() => {
    if (!stats) return null;
    return estimateDaysOnMarket(stats.yoyChangePct, stats.momChangePct);
  }, [stats]);

  const marketHealth = useMemo(() => getMarketHealth(monthsOfSupply), [monthsOfSupply]);

  // Heat map data (top 20 metros for visualization)
  const heatMapData = useMemo(() => {
    const top20 = sortedSummary.slice(0, 20);
    const maxInventory = Math.max(...top20.map(r => r.inventoryCount));
    return top20.map(r => ({
      ...r,
      color: getHeatColor(r.inventoryCount, maxInventory),
      shortName: r.regionName.split(',')[0].substring(0, 15),
    }));
  }, [sortedSummary]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">For-Sale Inventory</h1>
        <p className="text-gray-500 mt-1">
          Track housing supply levels and inventory trends
        </p>
      </div>

      {/* Region Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select a Region</CardTitle>
          <CardDescription>
            Choose a metro area to view detailed inventory trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegionComparePicker
            selectedRegions={selectedRegion ? [selectedRegion] : []}
            onRegionsChange={handleRegionSelect}
            maxRegions={1}
          />
        </CardContent>
      </Card>

      {/* Region-Specific View */}
      {selectedRegion && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Time Range</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_RANGES.map((range) => (
                    <Button
                      key={range.value}
                      variant={months === range.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMonths(range.value)}
                      className="text-xs"
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Current Inventory</p>
                    <p className="text-2xl font-bold">
                      {stats.currentInventory?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Active listings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Year-over-Year</p>
                    <div className="flex items-center gap-2">
                      {renderTrendIcon(stats.yoyChangePct)}
                      <p className={cn(
                        'text-2xl font-bold',
                        stats.yoyChangePct && stats.yoyChangePct > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {stats.yoyChangePct !== null 
                          ? `${stats.yoyChangePct >= 0 ? '+' : ''}${stats.yoyChangePct.toFixed(1)}%`
                          : 'N/A'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Month-over-Month</p>
                    <div className="flex items-center gap-2">
                      {renderTrendIcon(stats.momChangePct)}
                      <p className={cn(
                        'text-2xl font-bold',
                        stats.momChangePct && stats.momChangePct > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {stats.momChangePct !== null 
                          ? `${stats.momChangePct >= 0 ? '+' : ''}${stats.momChangePct.toFixed(1)}%`
                          : 'N/A'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">1 Year Ago</p>
                    <p className="text-2xl font-bold">
                      {stats.inventoryOneYearAgo?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">For comparison</p>
                  </CardContent>
                </Card>
              </div>

              {/* Supply/Demand Index & Days on Market */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Months of Supply / Supply-Demand Index */}
                <Card className="border-l-4" style={{ borderLeftColor: marketHealth.color === 'red' ? '#ef4444' : marketHealth.color === 'orange' ? '#f97316' : marketHealth.color === 'green' ? '#22c55e' : marketHealth.color === 'blue' ? '#3b82f6' : '#6366f1' }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Scale className="h-5 w-5" />
                      Supply-Demand Index
                    </CardTitle>
                    <CardDescription>
                      Estimated months of supply based on inventory trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold">
                        {monthsOfSupply !== null ? monthsOfSupply.toFixed(1) : 'N/A'}
                      </span>
                      <span className="text-lg text-muted-foreground">months</span>
                    </div>
                    <div className="mt-3">
                      <Badge 
                        className={cn(
                          'text-sm',
                          marketHealth.color === 'red' && 'bg-red-100 text-red-700 hover:bg-red-100',
                          marketHealth.color === 'orange' && 'bg-orange-100 text-orange-700 hover:bg-orange-100',
                          marketHealth.color === 'green' && 'bg-green-100 text-green-700 hover:bg-green-100',
                          marketHealth.color === 'blue' && 'bg-blue-100 text-blue-700 hover:bg-blue-100',
                          marketHealth.color === 'indigo' && 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
                        )}
                      >
                        {marketHealth.label}
                      </Badge>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {marketHealth.description}
                      </p>
                    </div>
                    {/* Supply gauge */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Seller&apos;s</span>
                        <span>Balanced</span>
                        <span>Buyer&apos;s</span>
                      </div>
                      <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 relative">
                        {monthsOfSupply !== null && (
                          <div 
                            className="absolute w-4 h-4 bg-white border-2 border-gray-800 rounded-full -top-0.5 transform -translate-x-1/2 shadow"
                            style={{ left: `${Math.min(100, Math.max(0, (monthsOfSupply / 10) * 100))}%` }}
                          />
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0</span>
                        <span>6</span>
                        <span>10+</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Days on Market Estimate */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5" />
                      Estimated Days on Market
                    </CardTitle>
                    <CardDescription>
                      How long homes typically stay listed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold">
                        {daysOnMarket !== null ? daysOnMarket : 'N/A'}
                      </span>
                      <span className="text-lg text-muted-foreground">days</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Market Speed</p>
                          <p className="font-medium">
                            {daysOnMarket !== null ? (
                              daysOnMarket < 20 ? '🔥 Very Fast' :
                              daysOnMarket < 35 ? '⚡ Fast' :
                              daysOnMarket < 50 ? '⏱️ Normal' :
                              daysOnMarket < 70 ? '🐢 Slow' :
                              '🐌 Very Slow'
                            ) : 'Unknown'}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Buyer Tip</p>
                          <p className="text-sm">
                            {daysOnMarket !== null ? (
                              daysOnMarket < 25 ? 'Act fast, expect competition' :
                              daysOnMarket < 45 ? 'Standard timeline, be prepared' :
                              'Take your time, room to negotiate'
                            ) : 'Insufficient data'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground italic">
                      * Estimate based on inventory trends. Actual DOM varies by property.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Inventory Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Trend - {selectedRegion.regionName}
              </CardTitle>
              <CardDescription>
                For-sale listings over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : trends.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart
                    data={trends}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="inventoryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="formattedDate"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value, index) => {
                        if (index % 6 === 0) return value;
                        return '';
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => `${label}`}
                          formatter={(value) => [
                            `${Number(value).toLocaleString()} listings`,
                            'Inventory',
                          ]}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="inventoryCount"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#inventoryGradient)"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No inventory data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Inventory Heat Map - Geographic Distribution */}
      {nationalSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Inventory Distribution Heat Map
            </CardTitle>
            <CardDescription>
              Top 20 metros by for-sale inventory (color = relative inventory level)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={heatMapData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="shortName" 
                    width={90}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as RegionSummary & { color: string };
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3">
                          <p className="font-medium">{data.regionName}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.inventoryCount.toLocaleString()} listings
                          </p>
                          {data.yoyChangePct !== null && (
                            <p className={cn(
                              'text-sm',
                              data.yoyChangePct > 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {data.yoyChangePct >= 0 ? '+' : ''}{data.yoyChangePct.toFixed(1)}% YoY
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="inventoryCount" radius={[0, 4, 4, 0]}>
                    {heatMapData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-muted-foreground">Low Inventory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-muted-foreground">Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500" />
                <span className="text-muted-foreground">Above Average</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500" />
                <span className="text-muted-foreground">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-muted-foreground">Very High</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* National Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Metro Areas by Inventory
              </CardTitle>
              <CardDescription>
                Current for-sale inventory levels across major markets
              </CardDescription>
            </div>
            {nationalTotals && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Tracked</p>
                <p className="text-2xl font-bold">
                  {nationalTotals.totalInventory.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && nationalSummary.length === 0 ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium">Rank</th>
                    <th className="text-left py-3 px-3 font-medium">Metro Area</th>
                    <th 
                      className="text-right py-3 px-3 font-medium cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('inventory')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Inventory
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-3 font-medium cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('change')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        YoY Change
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-right py-3 px-3 font-medium">Market Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSummary.map((region, index) => (
                    <tr 
                      key={region.regionId} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedRegion({
                        regionId: region.regionId,
                        regionName: region.regionName,
                        displayName: null,
                        geographyLevel: 'Metro',
                        state: region.state,
                        stateName: null,
                        city: null,
                        county: null,
                        metro: region.regionName,
                        sizeRank: region.sizeRank,
                        color: '#3b82f6',
                      })}
                    >
                      <td className="py-3 px-3 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{region.regionName}</div>
                        {region.state && (
                          <div className="text-xs text-muted-foreground">{region.state}</div>
                        )}
                      </td>
                      <td className="text-right py-3 px-3 font-mono">
                        {region.inventoryCount.toLocaleString()}
                      </td>
                      <td className={cn(
                        'text-right py-3 px-3 font-mono',
                        region.yoyChangePct && region.yoyChangePct > 0 
                          ? 'text-green-600' 
                          : region.yoyChangePct && region.yoyChangePct < 0 
                            ? 'text-red-600' 
                            : ''
                      )}>
                        {region.yoyChangePct !== null 
                          ? `${region.yoyChangePct >= 0 ? '+' : ''}${region.yoyChangePct.toFixed(1)}%`
                          : 'N/A'}
                      </td>
                      <td className="text-right py-3 px-3">
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            'text-xs',
                            region.yoyChangePct && region.yoyChangePct > 10 
                              ? 'bg-green-100 text-green-700'
                              : region.yoyChangePct && region.yoyChangePct < -10
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {region.yoyChangePct && region.yoyChangePct > 10 
                            ? 'Buyer Friendly'
                            : region.yoyChangePct && region.yoyChangePct < -10
                              ? 'Seller Friendly'
                              : 'Balanced'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insight Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="py-6">
          <h3 className="font-semibold text-lg mb-2">📊 Understanding Inventory</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Rising Inventory</p>
              <p>More supply = more options for buyers, potential price moderation</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Falling Inventory</p>
              <p>Less supply = competition among buyers, potential price increases</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Months of Supply</p>
              <p>6 months = balanced market. Below = seller&apos;s market, above = buyer&apos;s market</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

