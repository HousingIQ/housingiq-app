'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';

interface TrendDataPoint {
  date: string;
  homeValue: number | null;
  rentValue: number | null;
  momChangePct: number | null;
}

interface PriceTrendChartProps {
  data: TrendDataPoint[];
  regionName: string;
  isLoading?: boolean;
}

// Chart colors matching shadcn neutral theme
const CHART_COLORS = {
  homeValue: '#2563eb', // blue-600 - home value line
  rentValue: '#16a34a', // green-600 - rent value line
  border: '#e5e7eb',    // gray-200 - grid lines
  muted: '#6b7280',     // gray-500 - axis text
} as const;

// Custom tooltip component using shadcn styling
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; payload: TrendDataPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
      <p className="mb-2 font-medium">
        {formatDate(dataPoint.date)}
      </p>
      {dataPoint.homeValue !== null && (
        <p className="text-sm text-muted-foreground">
          Home Value:{' '}
          <span className="font-medium" style={{ color: CHART_COLORS.homeValue }}>
            {formatCurrency(dataPoint.homeValue)}
          </span>
        </p>
      )}
      {dataPoint.rentValue !== null && (
        <p className="text-sm text-muted-foreground">
          Rent:{' '}
          <span className="font-medium" style={{ color: CHART_COLORS.rentValue }}>
            {formatCurrency(dataPoint.rentValue)}/mo
          </span>
        </p>
      )}
      {dataPoint.momChangePct !== null && (
        <p className="mt-1 text-sm text-muted-foreground">
          Home Value MoM:{' '}
          <span
            className={
              dataPoint.momChangePct >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-destructive'
            }
          >
            {dataPoint.momChangePct >= 0 ? '+' : ''}
            {dataPoint.momChangePct.toFixed(2)}%
          </span>
        </p>
      )}
    </div>
  );
}

export function PriceTrendChart({
  data,
  regionName,
  isLoading,
}: PriceTrendChartProps) {

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Trend</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Trend</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          Select a location to view price trends
        </CardContent>
      </Card>
    );
  }

  // Calculate Y-axis domains with padding
  const homeValues = data.map((d) => d.homeValue).filter((v): v is number => v !== null);
  const rentValues = data.map((d) => d.rentValue).filter((v): v is number => v !== null);

  const homeMin = Math.min(...homeValues);
  const homeMax = Math.max(...homeValues);
  const homePadding = (homeMax - homeMin) * 0.1 || homeMax * 0.1;

  const hasRentData = rentValues.length > 0;
  const rentMin = hasRentData ? Math.min(...rentValues) : 0;
  const rentMax = hasRentData ? Math.max(...rentValues) : 0;
  const rentPadding = hasRentData ? (rentMax - rentMin) * 0.1 || rentMax * 0.1 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>12-Month Price Trend</CardTitle>
        <CardDescription>
          Home values (ZHVI) and rent prices (ZORI) for {regionName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 60, bottom: 5, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_COLORS.border}
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: CHART_COLORS.muted }}
                tickFormatter={(value) => formatDate(value)}
                interval="preserveStartEnd"
                stroke={CHART_COLORS.muted}
                strokeOpacity={0.5}
              />
              <YAxis
                yAxisId="homeValue"
                tick={{ fontSize: 12, fill: CHART_COLORS.homeValue }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                domain={[homeMin - homePadding, homeMax + homePadding]}
                stroke={CHART_COLORS.homeValue}
                strokeOpacity={0.7}
              />
              {hasRentData && (
                <YAxis
                  yAxisId="rentValue"
                  orientation="right"
                  tick={{ fontSize: 12, fill: CHART_COLORS.rentValue }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  domain={[rentMin - rentPadding, rentMax + rentPadding]}
                  stroke={CHART_COLORS.rentValue}
                  strokeOpacity={0.7}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => (
                  <span style={{ color: CHART_COLORS.muted }}>
                    {value === 'homeValue' ? 'Home Value' : 'Rent'}
                  </span>
                )}
              />
              <Line
                yAxisId="homeValue"
                type="monotone"
                dataKey="homeValue"
                name="homeValue"
                stroke={CHART_COLORS.homeValue}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: CHART_COLORS.homeValue }}
                connectNulls
              />
              {hasRentData && (
                <Line
                  yAxisId="rentValue"
                  type="monotone"
                  dataKey="rentValue"
                  name="rentValue"
                  stroke={CHART_COLORS.rentValue}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: CHART_COLORS.rentValue }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
