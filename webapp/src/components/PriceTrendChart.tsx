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
  AreaChart,
  Area,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';

interface TrendDataPoint {
  date: string;
  homeValue: number | null;
  rentValue: number | null;
  momChangePct: number | null;
  priceToRentRatio: number | null;
}

interface PriceTrendChartProps {
  data: TrendDataPoint[];
  regionName: string;
  isLoading?: boolean;
  subtitle?: string;
}

// Chart colors matching shadcn neutral theme
const CHART_COLORS = {
  homeValue: '#2563eb', // blue-600 - home value line
  rentValue: '#16a34a', // green-600 - rent value line
  prRatio: '#8b5cf6',   // violet-500 - P/R ratio line
  border: '#e5e7eb',    // gray-200 - grid lines
  muted: '#6b7280',     // gray-500 - axis text
  buyZone: '#dcfce7',   // green-100 - favorable to buy
  neutralZone: '#fef9c3', // yellow-100 - neutral
  rentZone: '#fee2e2',  // red-100 - favorable to rent
} as const;

// Get P/R ratio interpretation
function getPriceToRentInterpretation(ratio: number | null): { label: string; color: string } {
  if (ratio === null) return { label: 'N/A', color: CHART_COLORS.muted };
  if (ratio <= 15) return { label: 'Buy-Favorable', color: '#16a34a' };
  if (ratio <= 20) return { label: 'Neutral', color: '#ca8a04' };
  return { label: 'Rent-Favorable', color: '#dc2626' };
}

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
  const prInterpretation = getPriceToRentInterpretation(dataPoint.priceToRentRatio);

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
      {dataPoint.priceToRentRatio !== null && (
        <p className="text-sm text-muted-foreground">
          P/R Ratio:{' '}
          <span className="font-medium" style={{ color: CHART_COLORS.prRatio }}>
            {dataPoint.priceToRentRatio.toFixed(1)}x
          </span>
          <span 
            className="ml-1.5 text-xs px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: prInterpretation.color + '20',
              color: prInterpretation.color 
            }}
          >
            {prInterpretation.label}
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

// Tooltip for P/R ratio chart
function PRRatioTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: TrendDataPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0].payload;
  const interpretation = getPriceToRentInterpretation(dataPoint.priceToRentRatio);

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-xs text-muted-foreground">
        {formatDate(dataPoint.date)}
      </p>
      {dataPoint.priceToRentRatio !== null && (
        <p className="font-medium" style={{ color: interpretation.color }}>
          {dataPoint.priceToRentRatio.toFixed(1)}x · {interpretation.label}
        </p>
      )}
    </div>
  );
}

export function PriceTrendChart({
  data,
  regionName,
  isLoading,
  subtitle,
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
          <Skeleton className="mt-4 h-[100px]" />
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
  const prRatios = data.map((d) => d.priceToRentRatio).filter((v): v is number => v !== null);

  const homeMin = Math.min(...homeValues);
  const homeMax = Math.max(...homeValues);
  const homePadding = (homeMax - homeMin) * 0.1 || homeMax * 0.1;

  const hasRentData = rentValues.length > 0;
  const rentMin = hasRentData ? Math.min(...rentValues) : 0;
  const rentMax = hasRentData ? Math.max(...rentValues) : 0;
  const rentPadding = hasRentData ? (rentMax - rentMin) * 0.1 || rentMax * 0.1 : 0;

  const hasPRData = prRatios.length > 0;
  const prMin = hasPRData ? Math.min(...prRatios, 10) : 10;
  const prMax = hasPRData ? Math.max(...prRatios, 25) : 25;

  // Get latest P/R ratio for display
  const latestPR = data.filter(d => d.priceToRentRatio !== null).slice(-1)[0]?.priceToRentRatio;
  const latestPRInterpretation = getPriceToRentInterpretation(latestPR ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Trend</CardTitle>
        <CardDescription>
          {subtitle ? (
            <span>{subtitle} for {regionName}</span>
          ) : (
            <span>Home values (ZHVI) and rent prices (ZORI) for {regionName}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Chart: Home Value + Rent */}
        <div className="h-[280px]">
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

        {/* P/R Ratio Chart - Only show if we have data */}
        {hasPRData && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Price-to-Rent Ratio</h4>
                <p className="text-xs text-muted-foreground">
                  Lower = favorable to buy · Higher = favorable to rent
                </p>
              </div>
              {latestPR && (
                <div className="text-right">
                  <span 
                    className="text-lg font-semibold"
                    style={{ color: CHART_COLORS.prRatio }}
                  >
                    {latestPR.toFixed(1)}x
                  </span>
                  <span 
                    className="ml-2 text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: latestPRInterpretation.color + '20',
                      color: latestPRInterpretation.color 
                    }}
                  >
                    {latestPRInterpretation.label}
                  </span>
                </div>
              )}
            </div>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
                >
                  {/* Reference areas for P/R zones */}
                  <ReferenceArea
                    y1={prMin}
                    y2={15}
                    fill={CHART_COLORS.buyZone}
                    fillOpacity={0.6}
                  />
                  <ReferenceArea
                    y1={15}
                    y2={20}
                    fill={CHART_COLORS.neutralZone}
                    fillOpacity={0.6}
                  />
                  <ReferenceArea
                    y1={20}
                    y2={prMax}
                    fill={CHART_COLORS.rentZone}
                    fillOpacity={0.6}
                  />
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.border}
                    strokeOpacity={0.3}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
                    }}
                    interval="preserveStartEnd"
                    stroke={CHART_COLORS.muted}
                    strokeOpacity={0.3}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[prMin - 2, prMax + 2]}
                    tick={{ fontSize: 10, fill: CHART_COLORS.muted }}
                    tickFormatter={(value) => `${value}x`}
                    stroke={CHART_COLORS.muted}
                    strokeOpacity={0.3}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <ReferenceLine
                    y={15}
                    stroke="#16a34a"
                    strokeDasharray="3 3"
                    strokeOpacity={0.7}
                  />
                  <ReferenceLine
                    y={20}
                    stroke="#dc2626"
                    strokeDasharray="3 3"
                    strokeOpacity={0.7}
                  />
                  <Tooltip content={<PRRatioTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="priceToRentRatio"
                    stroke={CHART_COLORS.prRatio}
                    strokeWidth={2}
                    fill={CHART_COLORS.prRatio}
                    fillOpacity={0.1}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Legend for zones */}
            <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 rounded" style={{ backgroundColor: CHART_COLORS.buyZone }} />
                <span>≤15x Buy</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 rounded" style={{ backgroundColor: CHART_COLORS.neutralZone }} />
                <span>15-20x Neutral</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 rounded" style={{ backgroundColor: CHART_COLORS.rentZone }} />
                <span>≥20x Rent</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
