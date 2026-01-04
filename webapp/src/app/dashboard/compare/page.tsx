'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Minus, Home, DollarSign, BarChart3, SlidersHorizontal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';
import { RegionComparePicker, SelectedRegion } from '@/components/RegionComparePicker';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

interface RegionStats {
  regionId: string;
  regionName: string | null;
  displayName: string | null;
  geographyLevel: string | null;
  state: string | null;
  stateName: string | null;
  city: string | null;
  county: string | null;
  metro: string | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  homeValueMomPct: number | null;
  currentRentValue: number | null;
  rentYoyPct: number | null;
  priceToRentRatio: number | null;
  marketClassification: string | null;
  color: string;
}

interface TrendData {
  date: string;
  formattedDate: string;
  [key: string]: string | number;
}

interface CompareData {
  regions: Record<string, RegionStats>;
  homeValueTrends: TrendData[];
  rentTrends: TrendData[];
  priceToRentTrends: TrendData[];
  filters: {
    homeType: string;
    tier: string;
    months: number;
  };
}

// Filter options
const HOME_TYPES = [
  { value: 'All Homes', label: 'All Homes' },
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Multi Family', label: 'Multi Family' },
];

const TIERS = [
  { value: 'Bottom-Tier', label: 'Bottom Tier' },
  { value: 'Mid-Tier', label: 'Mid Tier' },
  { value: 'Top-Tier', label: 'Top Tier' },
];

const TIME_RANGES = [
  { value: 12, label: '1 Year' },
  { value: 36, label: '3 Years' },
  { value: 60, label: '5 Years' },
  { value: 120, label: '10 Years' },
];

// Level badge colors
const levelColors: Record<string, string> = {
  National: 'bg-purple-100 text-purple-700',
  State: 'bg-blue-100 text-blue-700',
  Metro: 'bg-emerald-100 text-emerald-700',
  County: 'bg-orange-100 text-orange-700',
  City: 'bg-pink-100 text-pink-700',
  Zip: 'bg-gray-100 text-gray-700',
};

// Market classification colors
const marketClassColors: Record<string, string> = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-orange-100 text-orange-700',
  neutral: 'bg-gray-100 text-gray-700',
  cool: 'bg-blue-100 text-blue-700',
  cold: 'bg-cyan-100 text-cyan-700',
};

export default function ComparePage() {
  const [selectedRegions, setSelectedRegions] = useState<SelectedRegion[]>([]);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [homeType, setHomeType] = useState('All Homes');
  const [tier, setTier] = useState('Mid-Tier');
  const [months, setMonths] = useState(60);

  // Generate chart config from selected regions
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    selectedRegions.forEach((region) => {
      config[region.regionId] = {
        label: getShortName(region),
        color: region.color,
      };
    });
    return config;
  }, [selectedRegions]);

  // Fetch data when selected regions or filters change
  useEffect(() => {
    const fetchData = async () => {
      if (selectedRegions.length === 0) {
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const regionIds = selectedRegions.map(r => r.regionId).join(',');
        const params = new URLSearchParams({
          regions: regionIds,
          homeType,
          tier,
          months: months.toString(),
        });
        const response = await fetch(`/api/market/compare?${params}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data);
      } catch (err) {
        console.error('Failed to fetch compare data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRegions, homeType, tier, months]);

  const renderTrendIcon = (value: number | null) => {
    if (value === null) return <Minus className="h-4 w-4 text-gray-400" />;
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Get filter description for chart subtitles
  const filterDescription = `${homeType} • ${tier.replace('-', ' ')} • Last ${months >= 12 ? months / 12 : months} ${months >= 12 ? (months / 12 === 1 ? 'year' : 'years') : 'months'}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compare Regions</h1>
        <p className="text-gray-500 mt-1">
          Compare home values, rent prices, and P/R ratios across different regions
        </p>
      </div>

      {/* Region Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Select Regions to Compare</CardTitle>
          <CardDescription>
            Search and select up to 4 regions to compare. You can mix different geography levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegionComparePicker
            selectedRegions={selectedRegions}
            onRegionsChange={setSelectedRegions}
            maxRegions={4}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      {selectedRegions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="h-5 w-5" />
              Chart Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-start gap-6">
              {/* Home Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Home Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {HOME_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={homeType === type.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setHomeType(type.value)}
                      className="text-xs"
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tier Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Price Tier</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TIERS.map((t) => (
                    <Button
                      key={t.value}
                      variant={tier === t.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTier(t.value)}
                      className="text-xs"
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time Range Filter */}
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State for Stats */}
      {loading && selectedRegions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedRegions.map((region) => (
            <Card key={region.regionId}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Region Stats Cards */}
      {!loading && !error && selectedRegions.length > 0 && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedRegions.map((selectedRegion) => {
            const stats = data.regions[selectedRegion.regionId];
            if (!stats) return null;

            return (
              <Card key={selectedRegion.regionId} className="overflow-hidden">
                {/* Color bar at top */}
                <div 
                  className="h-1.5" 
                  style={{ backgroundColor: selectedRegion.color }}
                />
                
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {getDisplayName(stats)}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn('shrink-0 text-[10px]', levelColors[stats.geographyLevel || ''])}
                    >
                      {stats.geographyLevel}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Home Value */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Home className="h-4 w-4" />
                      <span>Home Value</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {stats.currentHomeValue 
                          ? formatCurrency(stats.currentHomeValue)
                          : 'N/A'}
                      </div>
                      {stats.homeValueYoyPct !== null && (
                        <div className={cn(
                          'flex items-center justify-end gap-1 text-xs',
                          stats.homeValueYoyPct >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {renderTrendIcon(stats.homeValueYoyPct)}
                          {stats.homeValueYoyPct >= 0 ? '+' : ''}{stats.homeValueYoyPct.toFixed(1)}% YoY
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rent Value */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Rent</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {stats.currentRentValue 
                          ? `${formatCurrency(stats.currentRentValue)}/mo`
                          : 'N/A'}
                      </div>
                      {stats.rentYoyPct !== null && (
                        <div className={cn(
                          'flex items-center justify-end gap-1 text-xs',
                          stats.rentYoyPct >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {renderTrendIcon(stats.rentYoyPct)}
                          {stats.rentYoyPct >= 0 ? '+' : ''}{stats.rentYoyPct.toFixed(1)}% YoY
                        </div>
                      )}
                    </div>
                  </div>

                  {/* P/R Ratio & Market Classification */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      <span>P/R Ratio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {stats.priceToRentRatio 
                          ? `${stats.priceToRentRatio.toFixed(1)}x`
                          : 'N/A'}
                      </span>
                      {stats.marketClassification && (
                        <Badge 
                          variant="secondary" 
                          className={cn('text-[10px] capitalize', marketClassColors[stats.marketClassification])}
                        >
                          {stats.marketClassification}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Loading State for Charts */}
      {loading && selectedRegions.length > 0 && (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      {!loading && !error && selectedRegions.length > 0 && data && (
        <div className="grid gap-6">
          {/* Home Value Chart */}
          {data.homeValueTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Home Value Comparison
                </CardTitle>
                <CardDescription>
                  Zillow Home Value Index (ZHVI) — {filterDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart
                    data={data.homeValueTrends}
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="formattedDate"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value, index) => {
                        const interval = months <= 36 ? 6 : 12;
                        if (index % interval === 0) return value;
                        return '';
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => `${label}`}
                          formatter={(value, name) => {
                            const regionId = String(name);
                            const config = chartConfig[regionId];
                            return (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {config?.label || regionId}
                                </span>
                                <span className="font-mono font-medium">
                                  {formatCurrency(Number(value))}
                                </span>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {selectedRegions.map((region) => (
                      <Line
                        key={region.regionId}
                        dataKey={region.regionId}
                        type="monotone"
                        stroke={region.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Rent Price Chart */}
          {data.rentTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Rent Price Comparison
                </CardTitle>
                <CardDescription>
                  Zillow Observed Rent Index (ZORI) — Last {months >= 12 ? months / 12 : months} {months >= 12 ? (months / 12 === 1 ? 'year' : 'years') : 'months'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart
                    data={data.rentTrends}
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="formattedDate"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value, index) => {
                        const interval = months <= 36 ? 6 : 12;
                        if (index % interval === 0) return value;
                        return '';
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => `${label}`}
                          formatter={(value, name) => {
                            const regionId = String(name);
                            const config = chartConfig[regionId];
                            return (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {config?.label || regionId}
                                </span>
                                <span className="font-mono font-medium">
                                  {formatCurrency(Number(value))}/mo
                                </span>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {selectedRegions.map((region) => (
                      <Line
                        key={region.regionId}
                        dataKey={region.regionId}
                        type="monotone"
                        stroke={region.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Price-to-Rent Ratio Chart */}
          {data.priceToRentTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Price-to-Rent Ratio Comparison
                </CardTitle>
                <CardDescription>
                  Home Value ÷ (Annual Rent) — Lower values favor buying, higher favor renting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart
                    data={data.priceToRentTrends}
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="formattedDate"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value, index) => {
                        const interval = months <= 36 ? 6 : 12;
                        if (index % interval === 0) return value;
                        return '';
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `${value}x`}
                      domain={['auto', 'auto']}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => `${label}`}
                          formatter={(value, name) => {
                            const regionId = String(name);
                            const config = chartConfig[regionId];
                            const numValue = Number(value);
                            const interpretation = numValue < 15 
                              ? 'Buy-favorable' 
                              : numValue > 20 
                                ? 'Rent-favorable' 
                                : 'Neutral';
                            return (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {config?.label || regionId}
                                </span>
                                <span className="font-mono font-medium">
                                  {numValue.toFixed(1)}x
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    ({interpretation})
                                  </span>
                                </span>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {selectedRegions.map((region) => (
                      <Line
                        key={region.regionId}
                        dataKey={region.regionId}
                        type="monotone"
                        stroke={region.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>

                {/* P/R Ratio Legend */}
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span>&lt;15x: Buy favorable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span>15-20x: Neutral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span>&gt;20x: Rent favorable</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {selectedRegions.length === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No regions selected
            </p>
            <p className="text-gray-400 mt-1">
              Add regions above to compare home values, rents, and price-to-rent ratios
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper functions
function getDisplayName(region: RegionStats | SelectedRegion) {
  if ('displayName' in region && region.displayName) return region.displayName;
  if (region.geographyLevel === 'State') {
    return region.stateName || region.regionName;
  }
  if (region.geographyLevel === 'Metro' && region.state) {
    return `${region.regionName}, ${region.state}`;
  }
  if (region.geographyLevel === 'County' && region.state) {
    return `${region.county || region.regionName}, ${region.state}`;
  }
  if (region.geographyLevel === 'City' && region.state) {
    return `${region.city || region.regionName}, ${region.state}`;
  }
  return region.regionName;
}

function getShortName(region: RegionStats | SelectedRegion) {
  if (region.geographyLevel === 'State') {
    return region.state || region.regionName;
  }
  if (region.geographyLevel === 'City' && region.city) {
    return region.city;
  }
  if (region.geographyLevel === 'County' && region.county) {
    return region.county?.replace(' County', '') || region.regionName;
  }
  if (region.geographyLevel === 'Metro') {
    // Shorten metro names like "Austin-Round Rock-San Marcos, TX" to "Austin"
    const name = region.regionName || '';
    return name.split('-')[0].split(',')[0];
  }
  return region.regionName;
}
