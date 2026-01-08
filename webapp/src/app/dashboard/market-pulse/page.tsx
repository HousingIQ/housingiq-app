'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Snowflake,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface MarketHeatData {
  regionId: string;
  date: string;
  heatIndex: number;
  geographyLevel: string;
  momChange: number | null;
  yoyChange: number | null;
  marketTemperature: string;
}

interface HeatSummary {
  avgHeatIndex: number;
  totalRegions: number;
  hotMarkets: number;
  coldMarkets: number;
}

interface MarketHeatResponse {
  data: MarketHeatData[];
  hottest: MarketHeatData[];
  coolest: MarketHeatData[];
  summary: HeatSummary;
}

// Region name lookup (would come from database in production)
const REGION_NAMES: Record<string, string> = {
  '102001': 'United States',
  '394913': 'New York, NY',
  '753899': 'Los Angeles, CA',
  '394463': 'Chicago, IL',
  '395209': 'Dallas, TX',
  '394692': 'Houston, TX',
  '753875': 'Phoenix, AZ',
  '394856': 'Philadelphia, PA',
  '753879': 'San Diego, CA',
  '394514': 'San Antonio, TX',
};

const getTemperatureColor = (temp: string) => {
  switch (temp) {
    case 'Hot': return 'bg-red-500';
    case 'Warm': return 'bg-orange-500';
    case 'Balanced': return 'bg-yellow-500';
    case 'Cool': return 'bg-blue-400';
    case 'Cold': return 'bg-blue-600';
    default: return 'bg-gray-400';
  }
};

const getTemperatureBadge = (temp: string) => {
  switch (temp) {
    case 'Hot': return 'bg-red-100 text-red-700';
    case 'Warm': return 'bg-orange-100 text-orange-700';
    case 'Balanced': return 'bg-yellow-100 text-yellow-700';
    case 'Cool': return 'bg-blue-100 text-blue-700';
    case 'Cold': return 'bg-indigo-100 text-indigo-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const chartConfig: ChartConfig = {
  heatIndex: {
    label: 'Heat Index',
    color: '#ef4444',
  },
};

export default function MarketPulsePage() {
  const [data, setData] = useState<MarketHeatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/market/heat?limit=100');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch market heat data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderTrendIcon = (value: number | null) => {
    if (value === null) return <Minus className="h-4 w-4 text-gray-400" />;
    if (value > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-blue-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Market Pulse</h1>
        <p className="text-gray-500 mt-1">
          Real-time market temperature and heat index across regions
        </p>
      </div>

      {/* Summary Cards */}
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
      ) : data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">National Temperature</p>
              <div className="flex items-center gap-2 mt-1">
                <Thermometer className="h-6 w-6 text-orange-500" />
                <p className="text-3xl font-bold">{data.summary.avgHeatIndex}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average heat index (0-100)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Hot Markets</p>
              <div className="flex items-center gap-2 mt-1">
                <Flame className="h-6 w-6 text-red-500" />
                <p className="text-3xl font-bold text-red-600">{data.summary.hotMarkets}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Markets with heat index ≥60
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Cold Markets</p>
              <div className="flex items-center gap-2 mt-1">
                <Snowflake className="h-6 w-6 text-blue-500" />
                <p className="text-3xl font-bold text-blue-600">{data.summary.coldMarkets}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Markets with heat index &lt;40
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Markets</p>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-6 w-6 text-gray-500" />
                <p className="text-3xl font-bold">{data.summary.totalRegions}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Metros being tracked
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Temperature Gauge */}
      {data?.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              National Market Temperature
            </CardTitle>
            <CardDescription>
              Overall market heat index across all tracked metros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-6">
              {/* Temperature indicator */}
              <div className="relative w-full max-w-md">
                {/* Gauge background */}
                <div className="h-8 rounded-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600 relative overflow-hidden">
                  {/* Marker */}
                  <div 
                    className="absolute top-0 w-2 h-full bg-white border-2 border-gray-800 shadow-lg transform -translate-x-1/2"
                    style={{ left: `${Math.min(100, Math.max(0, data.summary.avgHeatIndex))}%` }}
                  />
                </div>
                {/* Labels */}
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>0 (Cold)</span>
                  <span>50 (Balanced)</span>
                  <span>100 (Hot)</span>
                </div>
              </div>
              {/* Value display */}
              <div className="mt-6 text-center">
                <p className="text-5xl font-bold">{data.summary.avgHeatIndex}</p>
                <Badge className={cn('mt-2', getTemperatureBadge(
                  data.summary.avgHeatIndex >= 60 ? 'Warm' :
                  data.summary.avgHeatIndex >= 40 ? 'Balanced' : 'Cool'
                ))}>
                  {data.summary.avgHeatIndex >= 60 ? '🔥 Warm Market' :
                   data.summary.avgHeatIndex >= 40 ? '⚖️ Balanced Market' : '❄️ Cool Market'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hottest & Coolest Markets */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Hottest Markets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              🔥 Hottest Markets
            </CardTitle>
            <CardDescription>
              Markets with the highest heat index
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.hottest.map((market, index) => (
                  <div
                    key={market.regionId}
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-red-600">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{REGION_NAMES[market.regionId] || `Region ${market.regionId}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {market.yoyChange !== null && (
                            <span className={market.yoyChange > 0 ? 'text-red-600' : 'text-blue-600'}>
                              {market.yoyChange > 0 ? '+' : ''}{market.yoyChange} YoY
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{market.heatIndex}</p>
                      <Badge className={getTemperatureBadge(market.marketTemperature)}>
                        {market.marketTemperature}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coolest Markets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-blue-500" />
              ❄️ Coolest Markets
            </CardTitle>
            <CardDescription>
              Markets with the lowest heat index
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.coolest.map((market, index) => (
                  <div
                    key={market.regionId}
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{REGION_NAMES[market.regionId] || `Region ${market.regionId}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {market.yoyChange !== null && (
                            <span className={market.yoyChange > 0 ? 'text-red-600' : 'text-blue-600'}>
                              {market.yoyChange > 0 ? '+' : ''}{market.yoyChange} YoY
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{market.heatIndex}</p>
                      <Badge className={getTemperatureBadge(market.marketTemperature)}>
                        {market.marketTemperature}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insight Card */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950">
        <CardContent className="py-6">
          <h3 className="font-semibold text-lg mb-2">🌡️ Understanding Market Heat Index</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Hot Markets (60-100)</p>
              <p>Strong seller&apos;s market. Expect competition, multiple offers, and quick sales.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Balanced Markets (40-60)</p>
              <p>Fair conditions for both buyers and sellers. Normal negotiation timelines.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Cool Markets (0-40)</p>
              <p>Buyer&apos;s market. More inventory, longer listing times, room for negotiation.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
