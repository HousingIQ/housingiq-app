'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { MarketOverviewCard } from '@/components/MarketOverviewCard';
import { PriceTrendChart } from '@/components/PriceTrendChart';

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
}

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // Fetch market overview when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setMarketData(null);
      setTrendData([]);
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

    const fetchTrendData = async () => {
      setIsLoadingTrends(true);
      try {
        const response = await fetch(`/api/market/${selectedRegion.regionId}/trends`);
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

    fetchMarketData();
    fetchTrendData();
  }, [selectedRegion]);

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
          <Label className="mb-2">Select Location</Label>
          <LocationSearchBar
            onSelect={handleRegionSelect}
            placeholder="Search for a metro area or state..."
            className="max-w-xl"
          />
        </CardContent>
      </Card>

      {/* Market Overview Card */}
      <MarketOverviewCard data={marketData} isLoading={isLoadingMarket} />

      {/* Price Trend Chart */}
      <PriceTrendChart
        data={trendData}
        regionName={selectedRegion?.regionName || ''}
        isLoading={isLoadingTrends}
      />

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
