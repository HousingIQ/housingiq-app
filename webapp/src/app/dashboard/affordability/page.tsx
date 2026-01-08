'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  DollarSign,
  Home,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  PiggyBank,
  Percent,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RegionComparePicker, SelectedRegion } from '@/components/RegionComparePicker';

interface AffordabilityData {
  mortgagePayments: { downPaymentPct: number; monthlyPayment: number; yoyChangePct: number | null }[];
  totalPayments: { downPaymentPct: number; monthlyPayment: number; yoyChangePct: number | null }[];
  homeownerIncomeNeeded: number | null;
  homeownerIncomeYoy: number | null;
  renterIncomeNeeded: number | null;
  renterIncomeYoy: number | null;
}

interface RegionInfo {
  regionId: string;
  regionName: string;
  displayName: string;
}

interface AffordabilityResponse {
  region: RegionInfo | null;
  data: AffordabilityData;
  meta: { regionId: string; latestDate: string };
}

const DOWN_PAYMENT_OPTIONS = [5, 10, 20];

export default function AffordabilityPage() {
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [downPayment, setDownPayment] = useState(20);
  const [data, setData] = useState<AffordabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userIncome, setUserIncome] = useState<number>(75000);

  // Fetch data when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/market/affordability?regionId=${selectedRegion.regionId}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch affordability data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedRegion]);

  const handleRegionSelect = (regions: SelectedRegion[]) => {
    setSelectedRegion(regions[0] || null);
  };

  // Get payment for selected down payment
  const getPaymentForDownPayment = (payments: { downPaymentPct: number; monthlyPayment: number }[]) => {
    const payment = payments.find(p => p.downPaymentPct === downPayment);
    return payment?.monthlyPayment || null;
  };

  const mortgagePayment = data ? getPaymentForDownPayment(data.data.mortgagePayments) : null;
  const totalPayment = data ? getPaymentForDownPayment(data.data.totalPayments) : null;

  // Calculate affordability
  const monthlyIncomeNeeded = totalPayment ? totalPayment / 0.28 : null; // 28% DTI ratio
  const annualIncomeNeeded = monthlyIncomeNeeded ? monthlyIncomeNeeded * 12 : null;
  const canAfford = annualIncomeNeeded ? userIncome >= annualIncomeNeeded : null;

  const renderTrendIcon = (value: number | null) => {
    if (value === null) return <Minus className="h-4 w-4 text-gray-400" />;
    if (value > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Affordability Calculator</h1>
        <p className="text-gray-500 mt-1">
          Calculate housing costs and income requirements for any market
        </p>
      </div>

      {/* Region Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select a Market</CardTitle>
          <CardDescription>
            Choose a metro area to see affordability metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegionComparePicker
            selectedRegions={selectedRegion ? [selectedRegion] : []}
            onRegionsChange={handleRegionSelect}
            maxRegions={1}
          />
        </CardContent>
      </Card>

      {/* Down Payment Selector */}
      {selectedRegion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Down Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {DOWN_PAYMENT_OPTIONS.map((pct) => (
                <Button
                  key={pct}
                  variant={downPayment === pct ? 'default' : 'outline'}
                  onClick={() => setDownPayment(pct)}
                  className="flex-1"
                >
                  {pct}%
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Affordability Metrics */}
      {data && !isLoading && (
        <>
          {/* Payment Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Monthly Mortgage</p>
                <div className="flex items-center gap-2 mt-1">
                  <Home className="h-6 w-6 text-blue-500" />
                  <p className="text-2xl font-bold">
                    {mortgagePayment ? `$${mortgagePayment.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Principal + Interest ({downPayment}% down)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Monthly Payment</p>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-6 w-6 text-green-500" />
                  <p className="text-2xl font-bold">
                    {totalPayment ? `$${totalPayment.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Including taxes & insurance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Income to Buy</p>
                <div className="flex items-center gap-2 mt-1">
                  <PiggyBank className="h-6 w-6 text-purple-500" />
                  <p className="text-2xl font-bold">
                    {data.data.homeownerIncomeNeeded 
                      ? `$${Math.round(data.data.homeownerIncomeNeeded).toLocaleString()}`
                      : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {renderTrendIcon(data.data.homeownerIncomeYoy)}
                  <p className="text-xs text-muted-foreground">
                    {data.data.homeownerIncomeYoy !== null 
                      ? `${data.data.homeownerIncomeYoy > 0 ? '+' : ''}${data.data.homeownerIncomeYoy.toFixed(1)}% YoY`
                      : 'Annual income required'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Income to Rent</p>
                <div className="flex items-center gap-2 mt-1">
                  <Building className="h-6 w-6 text-orange-500" />
                  <p className="text-2xl font-bold">
                    {data.data.renterIncomeNeeded 
                      ? `$${Math.round(data.data.renterIncomeNeeded).toLocaleString()}`
                      : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {renderTrendIcon(data.data.renterIncomeYoy)}
                  <p className="text-xs text-muted-foreground">
                    {data.data.renterIncomeYoy !== null 
                      ? `${data.data.renterIncomeYoy > 0 ? '+' : ''}${data.data.renterIncomeYoy.toFixed(1)}% YoY`
                      : 'Annual income required'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personal Affordability Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Can You Afford It?
              </CardTitle>
              <CardDescription>
                Enter your annual income to check affordability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Your Annual Income: ${userIncome.toLocaleString()}</Label>
                <Slider
                  value={[userIncome]}
                  onValueChange={(v: number[]) => setUserIncome(v[0])}
                  min={30000}
                  max={500000}
                  step={5000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$30k</span>
                  <span>$250k</span>
                  <span>$500k</span>
                </div>
              </div>

              {annualIncomeNeeded && (
                <div className={cn(
                  'p-4 rounded-lg border-2',
                  canAfford 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
                      canAfford ? 'bg-green-100' : 'bg-red-100'
                    )}>
                      {canAfford ? '✅' : '❌'}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {canAfford ? 'Yes, you can likely afford this market!' : 'This market may be a stretch'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Income needed: ${Math.round(annualIncomeNeeded).toLocaleString()}/year
                        {' '}(based on 28% DTI ratio)
                      </p>
                    </div>
                  </div>
                  
                  {!canAfford && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium">Gap to close:</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${Math.round(annualIncomeNeeded - userIncome).toLocaleString()}/year
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        or ${Math.round((annualIncomeNeeded - userIncome) / 12).toLocaleString()}/month additional income needed
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rent vs Buy Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Rent vs Buy</CardTitle>
              <CardDescription>
                Compare income requirements for renting vs buying
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold">Buy</h4>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    ${data.data.homeownerIncomeNeeded 
                      ? Math.round(data.data.homeownerIncomeNeeded).toLocaleString() 
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">Annual income needed</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-5 w-5 text-orange-600" />
                    <h4 className="font-semibold">Rent</h4>
                  </div>
                  <p className="text-3xl font-bold text-orange-600">
                    ${data.data.renterIncomeNeeded 
                      ? Math.round(data.data.renterIncomeNeeded).toLocaleString() 
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">Annual income needed</p>
                </div>
              </div>
              
              {data.data.homeownerIncomeNeeded && data.data.renterIncomeNeeded && (
                <div className="mt-4 p-4 rounded-lg bg-gray-50">
                  <p className="text-sm">
                    <span className="font-medium">
                      {data.data.homeownerIncomeNeeded > data.data.renterIncomeNeeded 
                        ? 'Buying requires ' 
                        : 'Renting requires '}
                    </span>
                    <span className="font-bold">
                      ${Math.abs(Math.round(data.data.homeownerIncomeNeeded - data.data.renterIncomeNeeded)).toLocaleString()}
                    </span>
                    <span className="font-medium"> more annual income than </span>
                    <span className="font-medium">
                      {data.data.homeownerIncomeNeeded > data.data.renterIncomeNeeded 
                        ? 'renting' 
                        : 'buying'}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Down Payment Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle>Down Payment Scenarios</CardTitle>
              <CardDescription>
                Compare monthly payments across different down payment amounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-3 font-medium">Down Payment</th>
                      <th className="text-right py-3 px-3 font-medium">Mortgage P+I</th>
                      <th className="text-right py-3 px-3 font-medium">Total Monthly</th>
                      <th className="text-right py-3 px-3 font-medium">YoY Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DOWN_PAYMENT_OPTIONS.map((pct) => {
                      const mortgage = data.data.mortgagePayments.find(p => p.downPaymentPct === pct);
                      const total = data.data.totalPayments.find(p => p.downPaymentPct === pct);
                      return (
                        <tr key={pct} className={cn(
                          'border-b',
                          pct === downPayment && 'bg-blue-50'
                        )}>
                          <td className="py-3 px-3 font-medium">{pct}%</td>
                          <td className="text-right py-3 px-3 font-mono">
                            {mortgage ? `$${mortgage.monthlyPayment.toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="text-right py-3 px-3 font-mono font-medium">
                            {total ? `$${total.monthlyPayment.toLocaleString()}` : 'N/A'}
                          </td>
                          <td className={cn(
                            'text-right py-3 px-3 font-mono',
                            total?.yoyChangePct && total.yoyChangePct > 0 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          )}>
                            {total?.yoyChangePct != null 
                              ? `${total.yoyChangePct > 0 ? '+' : ''}${total.yoyChangePct.toFixed(1)}%`
                              : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!selectedRegion && !isLoading && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Market to Begin</h3>
            <p className="text-muted-foreground">
              Choose a metro area above to see affordability metrics and calculate if you can afford it.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Insight Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <CardContent className="py-6">
          <h3 className="font-semibold text-lg mb-2">💡 Understanding Affordability</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">28% Rule</p>
              <p>Housing costs should not exceed 28% of gross monthly income.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Down Payment Impact</p>
              <p>Higher down payment = lower monthly payment + no PMI at 20%.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Total Cost</p>
              <p>Includes principal, interest, property taxes, and insurance.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
