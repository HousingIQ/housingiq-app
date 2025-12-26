'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, MapPin, Calendar } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';

// Sample data - will be replaced with actual API data
const sampleStates = [
  { id: 'CA', name: 'California' },
  { id: 'TX', name: 'Texas' },
  { id: 'FL', name: 'Florida' },
  { id: 'NY', name: 'New York' },
  { id: 'WA', name: 'Washington' },
];

// Seeded random for consistent SSR/client rendering
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate sample ZHVI data with deterministic values
function generateSampleData(baseValue: number, growthRate: number, seed: number) {
  const data = [];
  let value = baseValue;
  const startYear = 2015;
  const endYear = 2024;
  let seedCounter = seed;

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === endYear && month > 10) break;

      // Deterministic growth with seeded variation
      const variation = seededRandom(seedCounter++) * growthRate;
      const monthlyGrowth = 0.003 + variation;
      value = value * (1 + monthlyGrowth);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      data.push({
        date: `${year}-${month.toString().padStart(2, '0')}`,
        value: Math.round(value),
        formattedDate: `${monthNames[month - 1]} ${year}`,
      });
    }
  }
  return data;
}

const stateData: Record<string, ReturnType<typeof generateSampleData>> = {
  CA: generateSampleData(450000, 0.002, 1),
  TX: generateSampleData(250000, 0.003, 100),
  FL: generateSampleData(280000, 0.004, 200),
  NY: generateSampleData(380000, 0.002, 300),
  WA: generateSampleData(420000, 0.003, 400),
};

export default function DashboardPage() {
  const [selectedState, setSelectedState] = useState('CA');
  const data = stateData[selectedState] || [];

  const latestValue = data[data.length - 1]?.value || 0;
  const previousYearValue = data[data.length - 13]?.value || latestValue;
  const fiveYearsAgoValue = data[data.length - 61]?.value || latestValue;

  const yoyChange = ((latestValue - previousYearValue) / previousYearValue) * 100;
  const fiveYearChange = ((latestValue - fiveYearsAgoValue) / fiveYearsAgoValue) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Home Values Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Zillow Home Value Index (ZHVI) trends across the United States
        </p>
      </div>

      {/* State Selector */}
      <div className="flex flex-wrap gap-2">
        {sampleStates.map((state) => (
          <Button
            key={state.id}
            variant={selectedState === state.id ? 'default' : 'outline'}
            onClick={() => setSelectedState(state.id)}
          >
            {state.name}
          </Button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Current Median Value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(latestValue)}</div>
            <p className="text-sm text-gray-500">
              {sampleStates.find(s => s.id === selectedState)?.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              {yoyChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              Year-over-Year Change
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${yoyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-500">vs. same month last year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              5-Year Change
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${fiveYearChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fiveYearChange >= 0 ? '+' : ''}{fiveYearChange.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-500">since {data[data.length - 61]?.formattedDate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data Range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.length}</div>
            <p className="text-sm text-gray-500">months of data available</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Home Value Trend</CardTitle>
          <CardDescription>
            Zillow Home Value Index (ZHVI) for {sampleStates.find(s => s.id === selectedState)?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value, index) => {
                    // Show every 12th label (yearly)
                    if (index % 12 === 0) return value;
                    return '';
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [typeof value === 'number' ? formatCurrency(value) : String(value), 'ZHVI']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Home Value"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">About ZHVI</h3>
          <p className="text-blue-800 text-sm">
            The Zillow Home Value Index (ZHVI) is a smoothed, seasonally adjusted measure of the
            typical home value and market changes across a given region and housing type. It reflects
            the typical value for homes in the 35th to 65th percentile range.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
