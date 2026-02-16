'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Home, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MarketOverviewData {
  regionName: string | null;
  displayName: string | null;
  geographyLevel: string | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  currentRentValue: number | null;
  rentYoyPct: number | null;
  priceToRentRatio: number | null;
  marketClassification: string | null;
}

interface MarketOverviewCardProps {
  data: MarketOverviewData | null;
  isLoading?: boolean;
}

// Market classification badge variants
const classificationConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  Hot: {
    variant: 'destructive',
    label: "Hot Seller's Market",
  },
  Warm: {
    variant: 'default',
    label: 'Warm Market',
  },
  Cold: {
    variant: 'secondary',
    label: "Cold Buyer's Market",
  },
  Unknown: {
    variant: 'outline',
    label: 'Unknown',
  },
};

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  suffix = '',
}: {
  label: string;
  value: string | null;
  change?: number | null;
  icon: React.ElementType;
  suffix?: string;
}) {
  const isPositive = change !== null && change !== undefined && change >= 0;

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-2xl font-bold">
        {value || 'N/A'}
        {suffix && <span className="text-base font-normal text-muted-foreground">{suffix}</span>}
      </div>
      {change !== null && change !== undefined && (
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-sm',
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>
            {isPositive ? '+' : ''}
            {formatPercent(change)} YoY
          </span>
        </div>
      )}
    </div>
  );
}

export function MarketOverviewCard({
  data,
  isLoading,
}: MarketOverviewCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select a location to view market overview
        </CardContent>
      </Card>
    );
  }

  const classification = (data.marketClassification || 'Unknown') as keyof typeof classificationConfig;
  const config = classificationConfig[classification] || classificationConfig.Unknown;

  // Determine price-to-rent interpretation
  const getPriceToRentLabel = (ratio: number | null) => {
    if (ratio === null) return null;
    if (ratio > 20) return 'High (Favor Renting)';
    if (ratio > 15) return 'Moderate';
    return 'Low (Favor Buying)';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div>
            <CardTitle className="text-xl">
              {data.displayName || data.regionName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{data.geographyLevel} Level</p>
          </div>
          <Badge variant={config.variant} className="self-start">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          'grid grid-cols-1 gap-4',
          data.currentRentValue != null ? 'md:grid-cols-3' : 'md:grid-cols-1'
        )}>
          <MetricCard
            label="Median Home Price"
            value={data.currentHomeValue ? formatCurrency(data.currentHomeValue) : null}
            change={data.homeValueYoyPct}
            icon={Home}
          />
          {data.currentRentValue != null && (
            <MetricCard
              label="Median Rent"
              value={formatCurrency(data.currentRentValue)}
              change={data.rentYoyPct}
              icon={DollarSign}
              suffix="/mo"
            />
          )}
          {data.currentRentValue != null && data.priceToRentRatio != null && (
            <div className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Price-to-Rent Ratio
              </div>
              <div className="text-2xl font-bold">
                {data.priceToRentRatio.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">x</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {getPriceToRentLabel(data.priceToRentRatio)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
