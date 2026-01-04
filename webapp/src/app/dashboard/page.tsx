'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { MarketOverviewCard } from '@/components/MarketOverviewCard';
import { PriceTrendChart } from '@/components/PriceTrendChart';
import { BedroomComparisonChart } from '@/components/BedroomComparisonChart';
import { PropertyTypeAnalysis } from '@/components/PropertyTypeAnalysis';
import { MarketHealthScore } from '@/components/MarketHealthScore';

interface SelectedRegion {
  regionId: string;
  regionName: string;
  geographyLevel: string;
}

interface MarketData {
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

interface TrendData {
  date: string;
  homeValue: number | null;
  rentValue: number | null;
  momChangePct: number | null;
  priceToRentRatio: number | null;
}

// Filter options
const HOME_TYPES = [
  { value: 'All Homes', label: 'All Homes' },
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Multi Family', label: 'Multi Family' },
];

const TIERS = [
  { value: 'Bottom-Tier', label: 'Bottom' },
  { value: 'Mid-Tier', label: 'Mid' },
  { value: 'Top-Tier', label: 'Top' },
];

const TIME_RANGES = [
  { value: 12, label: '1Y' },
  { value: 36, label: '3Y' },
  { value: 60, label: '5Y' },
];

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // Filter states
  const [homeType, setHomeType] = useState('All Homes');
  const [tier, setTier] = useState('Mid-Tier');
  const [months, setMonths] = useState(12);

  // Fetch market overview when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setMarketData(null);
      return;
    }

    const fetchMarketData = async () => {
      setIsLoadingMarket(true);
      try {
        const response = await fetch(`/api/market/${selectedRegion.regionId}`);
        const result = await response.json();
        if (result.data) {
          setMarketData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      } finally {
        setIsLoadingMarket(false);
      }
    };

    fetchMarketData();
  }, [selectedRegion]);

  // Fetch trend data when region or filters change
  useEffect(() => {
    if (!selectedRegion) {
      setTrendData([]);
      return;
    }

    const fetchTrendData = async () => {
      setIsLoadingTrends(true);
      try {
        const params = new URLSearchParams({
          homeType,
          tier,
          months: months.toString(),
        });
        const response = await fetch(
          `/api/market/${selectedRegion.regionId}/trends?${params}`
        );
        const result = await response.json();
        if (result.data) {
          setTrendData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch trend data:', error);
      } finally {
        setIsLoadingTrends(false);
      }
    };

    fetchTrendData();
  }, [selectedRegion, homeType, tier, months]);

  const handleRegionSelect = (region: {
    regionId: string;
    regionName: string;
    geographyLevel: string;
  }) => {
    setSelectedRegion({
      regionId: region.regionId,
      regionName: region.regionName,
      geographyLevel: region.geographyLevel,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Housing Market Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Home values and rent trends across the United States
        </p>
      </div>

      {/* Location Search */}
      <Card>
        <CardContent className="pt-6">
          <Label className="mb-3 block text-base font-medium">Select Location</Label>
          <LocationSearchBar
            onSelect={handleRegionSelect}
            className="max-w-2xl"
          />
        </CardContent>
      </Card>

      {/* Market Overview Card */}
      <MarketOverviewCard data={marketData} isLoading={isLoadingMarket} />

      {/* Filters */}
      {selectedRegion && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-6">
              {/* Home Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Home Type</Label>
                <div className="flex gap-1">
                  {HOME_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={homeType === type.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setHomeType(type.value)}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tier Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Price Tier</Label>
                <div className="flex gap-1">
                  {TIERS.map((t) => (
                    <Button
                      key={t.value}
                      variant={tier === t.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTier(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Time Range</Label>
                <div className="flex gap-1">
                  {TIME_RANGES.map((range) => (
                    <Button
                      key={range.value}
                      variant={months === range.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMonths(range.value)}
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

      {/* Price Trend Chart */}
      <PriceTrendChart
        data={trendData}
        regionName={selectedRegion?.regionName || ''}
        isLoading={isLoadingTrends}
        subtitle={selectedRegion ? `${homeType} • ${tier} • Last ${months} months` : undefined}
      />

      {/* Market Health Score - Only show when region is selected and has data */}
      {selectedRegion && marketData && (
        <MarketHealthScore
          homeValueYoyPct={marketData.homeValueYoyPct}
          rentYoyPct={marketData.rentYoyPct}
          priceToRentRatio={marketData.priceToRentRatio}
          grossRentYieldPct={
            marketData.currentRentValue && marketData.currentHomeValue
              ? ((marketData.currentRentValue * 12) / marketData.currentHomeValue) * 100
              : null
          }
        />
      )}

      {/* Advanced Analysis Section */}
      {selectedRegion && (
        <div className="grid md:grid-cols-2 gap-6">
          <BedroomComparisonChart regionId={selectedRegion.regionId} />
          <PropertyTypeAnalysis regionId={selectedRegion.regionId} />
        </div>
      )}

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <h3 className="mb-2 font-semibold">About the Data</h3>
          <p className="text-sm text-muted-foreground">
            <strong>ZHVI (Home Value):</strong> The Zillow Home Value Index is a smoothed, seasonally
            adjusted measure of the typical home value. It reflects values for homes in the 35th to
            65th percentile range.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>ZORI (Rent):</strong> The Zillow Observed Rent Index is a smoothed measure of
            the typical observed market rate rent across a given region.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
