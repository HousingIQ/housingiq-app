'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BedDouble, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, formatCurrencyCompact, cn } from '@/lib/utils';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

interface BedroomData {
  date: string;
  formattedDate: string;
  bd1?: number;
  bd2?: number;
  bd3?: number;
  bd4?: number;
  bd5?: number;
}

interface BedroomStats {
  bedrooms: number;
  label: string;
  currentValue: number | null;
  yoyChange: number | null;
  color: string;
}

interface BedroomComparisonChartProps {
  regionId: string;
  className?: string;
}

const BEDROOM_CONFIG: ChartConfig = {
  bd1: { label: '1 Bedroom', color: '#3b82f6' },
  bd2: { label: '2 Bedroom', color: '#22c55e' },
  bd3: { label: '3 Bedroom', color: '#f59e0b' },
  bd4: { label: '4 Bedroom', color: '#ef4444' },
  bd5: { label: '5+ Bedroom', color: '#8b5cf6' },
};

const BEDROOM_COLORS = {
  bd1: '#3b82f6',
  bd2: '#22c55e',
  bd3: '#f59e0b',
  bd4: '#ef4444',
  bd5: '#8b5cf6',
};

export function BedroomComparisonChart({ regionId, className }: BedroomComparisonChartProps) {
  const [data, setData] = useState<BedroomData[]>([]);
  const [stats, setStats] = useState<BedroomStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!regionId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/market/${regionId}/bedrooms`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data.trends || []);
        setStats(result.data.stats || []);
      } catch (err) {
        console.error('Failed to fetch bedroom data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [regionId]);

  // Find which bedrooms have data
  const availableBedrooms = useMemo(() => {
    if (data.length === 0) return [];
    const sample = data[0];
    return Object.keys(BEDROOM_CONFIG).filter(
      (key) => sample[key as keyof BedroomData] !== undefined
    );
  }, [data]);

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
          <BedDouble className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-muted-foreground">No bedroom data available for this region</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BedDouble className="h-5 w-5" />
          Value by Bedroom Count
        </CardTitle>
        <CardDescription>
          Compare home values across different bedroom configurations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.bedrooms}
              className="rounded-lg border p-3"
              style={{ borderLeftColor: stat.color, borderLeftWidth: 4 }}
            >
              <div className="text-xs text-muted-foreground mb-1">{stat.label.replace('Bedroom', 'Br')}</div>
              <div className="font-bold text-base lg:text-lg">
                {stat.currentValue ? formatCurrencyCompact(stat.currentValue) : 'N/A'}
              </div>
              {stat.yoyChange !== null && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs mt-1',
                    stat.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {stat.yoyChange >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.yoyChange >= 0 ? '+' : ''}{stat.yoyChange.toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        <ChartContainer config={BEDROOM_CONFIG} className="h-[300px] w-full">
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
                    const key = String(name) as keyof typeof BEDROOM_CONFIG;
                    const config = BEDROOM_CONFIG[key];
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
            {availableBedrooms.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={BEDROOM_COLORS[key as keyof typeof BEDROOM_COLORS]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ChartContainer>

        {/* Insights */}
        {stats.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="font-medium mb-2">💡 Insights</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {(() => {
                const sortedByYoy = [...stats]
                  .filter((s) => s.yoyChange !== null)
                  .sort((a, b) => (b.yoyChange || 0) - (a.yoyChange || 0));
                
                if (sortedByYoy.length === 0) return null;
                
                const best = sortedByYoy[0];
                const worst = sortedByYoy[sortedByYoy.length - 1];
                
                return (
                  <>
                    <li>
                      <Badge variant="secondary" className="mr-2 bg-green-100 text-green-700">
                        Best Performer
                      </Badge>
                      {best.label} homes are up {best.yoyChange?.toFixed(1)}% YoY
                    </li>
                    {sortedByYoy.length > 1 && (
                      <li>
                        <Badge variant="secondary" className="mr-2 bg-gray-100 text-gray-700">
                          Slowest Growth
                        </Badge>
                        {worst.label} homes are {worst.yoyChange && worst.yoyChange >= 0 ? 'up' : 'down'} {Math.abs(worst.yoyChange || 0).toFixed(1)}% YoY
                      </li>
                    )}
                  </>
                );
              })()}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

