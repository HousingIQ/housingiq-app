'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, Home, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

interface PropertyTypeData {
  date: string;
  formattedDate: string;
  sfr?: number;
  condo?: number;
  allHomes?: number;
}

interface PropertyTypeStats {
  type: string;
  label: string;
  icon: 'home' | 'building';
  currentValue: number | null;
  yoyChange: number | null;
  color: string;
}

interface PropertyTypeAnalysisProps {
  regionId: string;
  className?: string;
}

const PROPERTY_CONFIG: ChartConfig = {
  sfr: { label: 'Single Family', color: '#3b82f6' },
  condo: { label: 'Condo/Co-op', color: '#f59e0b' },
  allHomes: { label: 'All Homes', color: '#6b7280' },
};

const PROPERTY_COLORS = {
  sfr: '#3b82f6',
  condo: '#f59e0b',
  allHomes: '#6b7280',
};

export function PropertyTypeAnalysis({ regionId, className }: PropertyTypeAnalysisProps) {
  const [data, setData] = useState<PropertyTypeData[]>([]);
  const [stats, setStats] = useState<PropertyTypeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!regionId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/market/${regionId}/property-types`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data.trends || []);
        setStats(result.data.stats || []);
      } catch (err) {
        console.error('Failed to fetch property type data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [regionId]);

  // Find which property types have data
  const availableTypes = useMemo(() => {
    if (data.length === 0) return [];
    const sample = data[0];
    return Object.keys(PROPERTY_CONFIG).filter(
      (key) => sample[key as keyof PropertyTypeData] !== undefined
    );
  }, [data]);

  // Calculate premium/discount
  const priceComparison = useMemo(() => {
    const sfrStat = stats.find((s) => s.type === 'sfr');
    const condoStat = stats.find((s) => s.type === 'condo');
    
    if (!sfrStat?.currentValue || !condoStat?.currentValue) return null;
    
    const diff = sfrStat.currentValue - condoStat.currentValue;
    const pct = (diff / condoStat.currentValue) * 100;
    
    return {
      diff,
      pct,
      sfrHigher: diff > 0,
    };
  }, [stats]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-muted-foreground">No property type data available for this region</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Property Type Comparison
        </CardTitle>
        <CardDescription>
          Single Family vs Condo/Co-op value trends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.type}
              className="rounded-lg border p-4"
              style={{ borderTopColor: stat.color, borderTopWidth: 4 }}
            >
              <div className="flex items-center gap-2 mb-2">
                {stat.icon === 'home' ? (
                  <Home className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{stat.label}</span>
              </div>
              <div className="font-bold text-2xl">
                {stat.currentValue ? formatCurrency(stat.currentValue) : 'N/A'}
              </div>
              {stat.yoyChange !== null && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm mt-2',
                    stat.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {stat.yoyChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {stat.yoyChange >= 0 ? '+' : ''}{stat.yoyChange.toFixed(1)}% YoY
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Price Comparison Banner */}
        {priceComparison && (
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-amber-50 dark:from-blue-950 dark:to-amber-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Price Difference</p>
                <p className="font-bold text-lg">
                  Single Family is{' '}
                  <span className={priceComparison.sfrHigher ? 'text-blue-600' : 'text-amber-600'}>
                    {formatCurrency(Math.abs(priceComparison.diff))} {priceComparison.sfrHigher ? 'more' : 'less'}
                  </span>
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {priceComparison.sfrHigher ? '+' : ''}{priceComparison.pct.toFixed(1)}%
              </Badge>
            </div>
          </div>
        )}

        {/* Chart */}
        <ChartContainer config={PROPERTY_CONFIG} className="h-[300px] w-full">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
          >
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => `${label}`}
                  formatter={(value, name) => {
                    const key = String(name) as keyof typeof PROPERTY_CONFIG;
                    const config = PROPERTY_CONFIG[key];
                    return (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {config?.label || name}
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
            {availableTypes.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={PROPERTY_COLORS[key as keyof typeof PROPERTY_COLORS]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ChartContainer>

        {/* Investment Insight */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">💡 Investment Insights</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {stats.length >= 2 && (() => {
              const sortedByYoy = [...stats]
                .filter((s) => s.yoyChange !== null && s.type !== 'allHomes')
                .sort((a, b) => (b.yoyChange || 0) - (a.yoyChange || 0));
              
              if (sortedByYoy.length === 0) return null;
              
              const best = sortedByYoy[0];
              
              return (
                <li>
                  <Badge variant="secondary" className="mr-2 bg-green-100 text-green-700">
                    Higher Appreciation
                  </Badge>
                  {best.label} properties are appreciating faster at {best.yoyChange?.toFixed(1)}% YoY
                </li>
              );
            })()}
            {priceComparison && (
              <li>
                <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-700">
                  Entry Point
                </Badge>
                {priceComparison.sfrHigher 
                  ? 'Condos offer a lower entry point for this market'
                  : 'Single family homes are more affordable in this market'}
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

