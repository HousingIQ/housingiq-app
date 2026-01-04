'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, Minus, Home, DollarSign, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketHealthScoreProps {
  homeValueYoyPct: number | null;
  rentYoyPct: number | null;
  priceToRentRatio: number | null;
  grossRentYieldPct: number | null;
  className?: string;
}

interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  description: string;
  icon: React.ElementType;
  status: 'positive' | 'neutral' | 'negative';
}

function calculateHealthScore(
  homeValueYoyPct: number | null,
  rentYoyPct: number | null,
  priceToRentRatio: number | null,
  grossRentYieldPct: number | null
): { total: number; breakdown: ScoreBreakdown[] } {
  const breakdown: ScoreBreakdown[] = [];

  // 1. Home Value Appreciation Score (0-25 points)
  // Sweet spot: 3-8% appreciation. Too high = bubble risk, negative = decline
  let hvScore = 0;
  if (homeValueYoyPct !== null) {
    if (homeValueYoyPct >= 3 && homeValueYoyPct <= 8) {
      hvScore = 25; // Healthy appreciation
    } else if (homeValueYoyPct > 8 && homeValueYoyPct <= 12) {
      hvScore = 20; // Hot but sustainable
    } else if (homeValueYoyPct > 12) {
      hvScore = 15; // Overheating concern
    } else if (homeValueYoyPct >= 0 && homeValueYoyPct < 3) {
      hvScore = 18; // Slow but positive
    } else if (homeValueYoyPct >= -3 && homeValueYoyPct < 0) {
      hvScore = 10; // Minor decline
    } else {
      hvScore = 5; // Significant decline
    }
  }
  breakdown.push({
    category: 'Appreciation',
    score: hvScore,
    maxScore: 25,
    description: homeValueYoyPct !== null 
      ? `${homeValueYoyPct >= 0 ? '+' : ''}${homeValueYoyPct.toFixed(1)}% YoY` 
      : 'No data',
    icon: TrendingUp,
    status: homeValueYoyPct !== null && homeValueYoyPct >= 3 ? 'positive' : homeValueYoyPct !== null && homeValueYoyPct < 0 ? 'negative' : 'neutral',
  });

  // 2. Rent Growth Score (0-25 points)
  // Sweet spot: 2-6% growth. Indicates healthy demand
  let rentScore = 0;
  if (rentYoyPct !== null) {
    if (rentYoyPct >= 2 && rentYoyPct <= 6) {
      rentScore = 25; // Healthy rent growth
    } else if (rentYoyPct > 6 && rentYoyPct <= 10) {
      rentScore = 20; // Strong demand
    } else if (rentYoyPct > 10) {
      rentScore = 15; // Extreme pressure
    } else if (rentYoyPct >= 0 && rentYoyPct < 2) {
      rentScore = 18; // Stable
    } else if (rentYoyPct >= -2 && rentYoyPct < 0) {
      rentScore = 12; // Slight decline
    } else {
      rentScore = 5; // Demand issues
    }
  }
  breakdown.push({
    category: 'Rent Growth',
    score: rentScore,
    maxScore: 25,
    description: rentYoyPct !== null 
      ? `${rentYoyPct >= 0 ? '+' : ''}${rentYoyPct.toFixed(1)}% YoY` 
      : 'No data',
    icon: DollarSign,
    status: rentYoyPct !== null && rentYoyPct >= 2 ? 'positive' : rentYoyPct !== null && rentYoyPct < 0 ? 'negative' : 'neutral',
  });

  // 3. Price-to-Rent Ratio Score (0-25 points)
  // <15 = buy favorable, 15-20 = neutral, >20 = rent favorable
  let prScore = 0;
  if (priceToRentRatio !== null) {
    if (priceToRentRatio < 15) {
      prScore = 25; // Great for buyers
    } else if (priceToRentRatio >= 15 && priceToRentRatio <= 18) {
      prScore = 22; // Good for buyers
    } else if (priceToRentRatio > 18 && priceToRentRatio <= 20) {
      prScore = 18; // Neutral
    } else if (priceToRentRatio > 20 && priceToRentRatio <= 25) {
      prScore = 12; // Leaning to renters
    } else {
      prScore = 5; // Expensive market
    }
  }
  breakdown.push({
    category: 'P/R Ratio',
    score: prScore,
    maxScore: 25,
    description: priceToRentRatio !== null 
      ? `${priceToRentRatio.toFixed(1)}x` 
      : 'No data',
    icon: BarChart3,
    status: priceToRentRatio !== null && priceToRentRatio < 18 ? 'positive' : priceToRentRatio !== null && priceToRentRatio > 22 ? 'negative' : 'neutral',
  });

  // 4. Gross Rent Yield Score (0-25 points)
  // >8% = excellent, 6-8% = good, 4-6% = average, <4% = poor
  let yieldScore = 0;
  if (grossRentYieldPct !== null) {
    if (grossRentYieldPct >= 8) {
      yieldScore = 25; // Excellent yield
    } else if (grossRentYieldPct >= 6 && grossRentYieldPct < 8) {
      yieldScore = 22; // Good yield
    } else if (grossRentYieldPct >= 5 && grossRentYieldPct < 6) {
      yieldScore = 18; // Average yield
    } else if (grossRentYieldPct >= 4 && grossRentYieldPct < 5) {
      yieldScore = 12; // Below average
    } else {
      yieldScore = 5; // Poor yield
    }
  }
  breakdown.push({
    category: 'Rent Yield',
    score: yieldScore,
    maxScore: 25,
    description: grossRentYieldPct !== null 
      ? `${grossRentYieldPct.toFixed(1)}%` 
      : 'No data',
    icon: Home,
    status: grossRentYieldPct !== null && grossRentYieldPct >= 6 ? 'positive' : grossRentYieldPct !== null && grossRentYieldPct < 4 ? 'negative' : 'neutral',
  });

  const total = breakdown.reduce((sum, item) => sum + item.score, 0);
  
  return { total, breakdown };
}

function getHealthLabel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 85) return { label: 'Excellent', color: 'text-green-700', bgColor: 'bg-green-100' };
  if (score >= 70) return { label: 'Good', color: 'text-blue-700', bgColor: 'bg-blue-100' };
  if (score >= 55) return { label: 'Fair', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
  if (score >= 40) return { label: 'Weak', color: 'text-orange-700', bgColor: 'bg-orange-100' };
  return { label: 'Poor', color: 'text-red-700', bgColor: 'bg-red-100' };
}

function getScoreColor(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-blue-500';
  if (pct >= 40) return 'bg-yellow-500';
  if (pct >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

export function MarketHealthScore({
  homeValueYoyPct,
  rentYoyPct,
  priceToRentRatio,
  grossRentYieldPct,
  className,
}: MarketHealthScoreProps) {
  const { total, breakdown } = useMemo(
    () => calculateHealthScore(homeValueYoyPct, rentYoyPct, priceToRentRatio, grossRentYieldPct),
    [homeValueYoyPct, rentYoyPct, priceToRentRatio, grossRentYieldPct]
  );

  const healthLabel = getHealthLabel(total);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Market Health Score
        </CardTitle>
        <CardDescription>
          Investment potential based on key metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">{total}</span>
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
          <Badge className={cn('text-lg px-4 py-1', healthLabel.bgColor, healthLabel.color)}>
            {healthLabel.label}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', getScoreColor(total, 100))}
            style={{ width: `${total}%` }}
          />
        </div>

        {/* Breakdown */}
        <div className="space-y-3 pt-2">
          {breakdown.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.category} className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-1.5 rounded',
                    item.status === 'positive' && 'bg-green-100 text-green-600',
                    item.status === 'neutral' && 'bg-gray-100 text-gray-600',
                    item.status === 'negative' && 'bg-red-100 text-red-600'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">{item.description}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', getScoreColor(item.score, item.maxScore))}
                      style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {item.score}/{item.maxScore}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recommendation */}
        <div className="rounded-lg bg-muted/50 p-3 mt-4">
          <p className="text-sm">
            {total >= 70 ? (
              <>
                <span className="font-medium text-green-600">🎯 Strong Investment Potential:</span>{' '}
                This market shows healthy fundamentals with balanced appreciation and yields.
              </>
            ) : total >= 50 ? (
              <>
                <span className="font-medium text-yellow-600">⚖️ Moderate Opportunity:</span>{' '}
                This market has mixed signals. Consider specific neighborhoods carefully.
              </>
            ) : (
              <>
                <span className="font-medium text-red-600">⚠️ Proceed with Caution:</span>{' '}
                This market shows concerning metrics. Thorough due diligence recommended.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

