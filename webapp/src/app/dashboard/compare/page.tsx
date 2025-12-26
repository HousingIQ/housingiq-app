'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
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

const availableStates = [
  { id: 'CA', name: 'California', color: '#2563eb' },
  { id: 'TX', name: 'Texas', color: '#16a34a' },
  { id: 'FL', name: 'Florida', color: '#dc2626' },
  { id: 'NY', name: 'New York', color: '#9333ea' },
  { id: 'WA', name: 'Washington', color: '#ea580c' },
  { id: 'CO', name: 'Colorado', color: '#0891b2' },
  { id: 'AZ', name: 'Arizona', color: '#db2777' },
  { id: 'NC', name: 'North Carolina', color: '#65a30d' },
];

// Seeded random for consistent SSR/client rendering
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate sample data for a state with deterministic values
function generateStateData(baseValue: number, growthRate: number, seed: number) {
  const data = [];
  let value = baseValue;
  let seedCounter = seed;

  for (let year = 2015; year <= 2024; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2024 && month > 10) break;

      const variation = seededRandom(seedCounter++) * growthRate;
      const monthlyGrowth = 0.003 + variation;
      value = value * (1 + monthlyGrowth);

      data.push({
        date: `${year}-${month.toString().padStart(2, '0')}`,
        value: Math.round(value),
      });
    }
  }
  return data;
}

const stateDataMap: Record<string, number[]> = {
  CA: generateStateData(450000, 0.002, 1).map(d => d.value),
  TX: generateStateData(250000, 0.003, 100).map(d => d.value),
  FL: generateStateData(280000, 0.004, 200).map(d => d.value),
  NY: generateStateData(380000, 0.002, 300).map(d => d.value),
  WA: generateStateData(420000, 0.003, 400).map(d => d.value),
  CO: generateStateData(380000, 0.003, 500).map(d => d.value),
  AZ: generateStateData(290000, 0.004, 600).map(d => d.value),
  NC: generateStateData(260000, 0.003, 700).map(d => d.value),
};

// Create combined chart data
function createChartData(selectedStates: string[]) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dates = [];
  for (let year = 2015; year <= 2024; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2024 && month > 10) break;
      dates.push({
        date: `${year}-${month.toString().padStart(2, '0')}`,
        formattedDate: `${monthNames[month - 1]} ${year}`,
      });
    }
  }

  return dates.map((d, i) => {
    const point: Record<string, string | number> = {
      date: d.date,
      formattedDate: d.formattedDate,
    };
    selectedStates.forEach(stateId => {
      point[stateId] = stateDataMap[stateId]?.[i] || 0;
    });
    return point;
  });
}

export default function ComparePage() {
  const [selectedStates, setSelectedStates] = useState<string[]>(['CA', 'TX']);

  const addState = (stateId: string) => {
    if (selectedStates.length < 4 && !selectedStates.includes(stateId)) {
      setSelectedStates([...selectedStates, stateId]);
    }
  };

  const removeState = (stateId: string) => {
    setSelectedStates(selectedStates.filter(s => s !== stateId));
  };

  const chartData = createChartData(selectedStates);

  const getStateStats = (stateId: string) => {
    const values = stateDataMap[stateId] || [];
    const current = values[values.length - 1] || 0;
    const yearAgo = values[values.length - 13] || current;
    const yoyChange = ((current - yearAgo) / yearAgo) * 100;
    return { current, yoyChange };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compare Regions</h1>
        <p className="text-gray-500 mt-1">
          Compare home value trends across different states (max 4)
        </p>
      </div>

      {/* State Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select States to Compare</CardTitle>
          <CardDescription>
            Click to add states. You can compare up to 4 states at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableStates.map((state) => {
              const isSelected = selectedStates.includes(state.id);
              return (
                <Button
                  key={state.id}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => isSelected ? removeState(state.id) : addState(state.id)}
                  disabled={!isSelected && selectedStates.length >= 4}
                  style={isSelected ? { backgroundColor: state.color } : {}}
                >
                  {state.name}
                  {isSelected && <X className="ml-2 h-4 w-4" />}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {selectedStates.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedStates.map((stateId) => {
            const state = availableStates.find(s => s.id === stateId);
            const stats = getStateStats(stateId);
            return (
              <Card key={stateId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: state?.color }}
                    />
                    <CardTitle className="text-lg">{state?.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.current)}
                  </div>
                  <p className={`text-sm ${stats.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.yoyChange >= 0 ? '+' : ''}{stats.yoyChange.toFixed(1)}% YoY
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comparison Chart */}
      {selectedStates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Home Value Comparison</CardTitle>
            <CardDescription>
              Zillow Home Value Index (ZHVI) comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value, index) => {
                      if (index % 12 === 0) return value;
                      return '';
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (typeof value !== 'number') return [String(value), String(name)];
                      const state = availableStates.find(s => s.id === name);
                      return [formatCurrency(value), state?.name || String(name)];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend
                    formatter={(value) => {
                      const state = availableStates.find(s => s.id === value);
                      return state?.name || value;
                    }}
                  />
                  {selectedStates.map((stateId) => {
                    const state = availableStates.find(s => s.id === stateId);
                    return (
                      <Line
                        key={stateId}
                        type="monotone"
                        dataKey={stateId}
                        name={stateId}
                        stroke={state?.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedStates.length === 0 && (
        <Card className="bg-gray-50">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              Select at least one state above to see the comparison chart.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
