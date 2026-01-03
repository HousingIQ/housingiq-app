'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RankingItem {
  rank: number;
  regionId: string;
  regionName: string | null;
  displayName: string | null;
  geographyLevel: string | null;
  stateCode: string | null;
  stateName: string | null;
  metro: string | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  currentRentValue: number | null;
  rentYoyPct: number | null;
  priceToRentRatio: number | null;
  grossRentYieldPct: number | null;
  marketClassification: string | null;
}

const GEOGRAPHY_LEVELS = [
  { value: 'State', label: 'States' },
  { value: 'Metro', label: 'Metro Areas' },
  { value: 'City', label: 'Cities' },
];

const SORT_OPTIONS = [
  { value: 'homeValueYoyPct', label: 'Home Value YoY%' },
  { value: 'rentYoyPct', label: 'Rent YoY%' },
  { value: 'grossRentYieldPct', label: 'Rent Yield%' },
  { value: 'priceToRentRatio', label: 'Price-to-Rent' },
  { value: 'currentHomeValue', label: 'Home Value' },
];

function getMarketBadge(classification: string | null) {
  switch (classification) {
    case 'Hot':
      return <Badge className="bg-red-500 hover:bg-red-600">Hot</Badge>;
    case 'Warm':
      return <Badge className="bg-orange-500 hover:bg-orange-600">Warm</Badge>;
    case 'Cold':
      return <Badge className="bg-blue-500 hover:bg-blue-600">Cold</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}

function getTrendIcon(value: number | null) {
  if (value === null) return <Minus className="h-4 w-4 text-gray-400" />;
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function formatPercent(value: number | null) {
  if (value === null) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function RankingsPage() {
  const router = useRouter();
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states - default to Metro since State doesn't have rent data
  const [geographyLevel, setGeographyLevel] = useState('Metro');
  const [sortBy, setSortBy] = useState('homeValueYoyPct');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          sortBy,
          order,
          geographyLevel,
          limit: '50',
        });
        const response = await fetch(`/api/market/rankings?${params}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch rankings');
        }

        setRankings(result.data);
      } catch (err) {
        console.error('Failed to fetch rankings:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch rankings');
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [geographyLevel, sortBy, order]);

  const handleRowClick = (regionId: string) => {
    router.push(`/dashboard?regionId=${regionId}`);
  };

  const toggleOrder = () => {
    setOrder(order === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Market Rankings</h1>
        <p className="text-gray-500 mt-1">
          Compare housing markets by appreciation, rent yield, and more
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Geography Level */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Geography</Label>
              <div className="flex gap-1">
                {GEOGRAPHY_LEVELS.map((level) => (
                  <Button
                    key={level.value}
                    variant={geographyLevel === level.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGeographyLevel(level.value)}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort By</Label>
              <div className="flex gap-1">
                {SORT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Order */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Order</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleOrder}
                className="flex items-center gap-1"
              >
                {order === 'desc' ? (
                  <>
                    <ArrowDown className="h-4 w-4" />
                    High to Low
                  </>
                ) : (
                  <>
                    <ArrowUp className="h-4 w-4" />
                    Low to High
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info for State level */}
      {geographyLevel === 'State' && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <p className="text-amber-700 text-sm text-center">
              Note: Zillow does not publish state-level rent data. Switch to Metro Areas or Cities to see rent metrics.
            </p>
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

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top {geographyLevel === 'State' ? 'States' : geographyLevel === 'Metro' ? 'Metro Areas' : 'Cities'}</CardTitle>
          <CardDescription>
            Ranked by {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rankings.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No data available for the selected filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 pr-4 font-medium">#</th>
                    <th className="pb-3 pr-4 font-medium">Region</th>
                    <th className="pb-3 pr-4 font-medium text-right">Home Value</th>
                    <th className="pb-3 pr-4 font-medium text-right">YoY%</th>
                    <th className="pb-3 pr-4 font-medium text-right">Rent</th>
                    <th className="pb-3 pr-4 font-medium text-right">Rent YoY%</th>
                    <th className="pb-3 pr-4 font-medium text-right">Yield%</th>
                    <th className="pb-3 font-medium text-center">Market</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((item) => (
                    <tr
                      key={item.regionId}
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(item.regionId)}
                    >
                      <td className="py-4 pr-4 font-medium text-gray-600">
                        {item.rank}
                      </td>
                      <td className="py-4 pr-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.displayName || item.regionName}
                          </div>
                          {item.geographyLevel !== 'State' && item.stateCode && (
                            <div className="text-sm text-gray-500">{item.stateName}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-right font-medium">
                        {item.currentHomeValue ? formatCurrency(item.currentHomeValue) : 'N/A'}
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(item.homeValueYoyPct)}
                          <span className={item.homeValueYoyPct && item.homeValueYoyPct >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercent(item.homeValueYoyPct)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-right">
                        {item.currentRentValue ? formatCurrency(item.currentRentValue) : 'N/A'}
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(item.rentYoyPct)}
                          <span className={item.rentYoyPct && item.rentYoyPct >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercent(item.rentYoyPct)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-right font-medium">
                        {item.grossRentYieldPct ? `${item.grossRentYieldPct.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="py-4 text-center">
                        {getMarketBadge(item.marketClassification)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
