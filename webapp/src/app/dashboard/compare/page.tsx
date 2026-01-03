'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

interface StateStats {
  regionId: string;
  stateCode: string;
  stateName: string | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  color: string;
}

interface TrendData {
  date: string;
  formattedDate: string;
  [key: string]: string | number;
}

interface CompareData {
  states: Record<string, StateStats>;
  trends: TrendData[];
}

export default function ComparePage() {
  const [selectedStates, setSelectedStates] = useState<string[]>(['CA', 'TX']);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addState = (stateId: string) => {
    if (selectedStates.length < 4 && !selectedStates.includes(stateId)) {
      setSelectedStates([...selectedStates, stateId]);
    }
  };

  const removeState = (stateId: string) => {
    setSelectedStates(selectedStates.filter(s => s !== stateId));
  };

  // Fetch data when selected states change
  useEffect(() => {
    const fetchData = async () => {
      if (selectedStates.length === 0) {
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/market/compare?states=${selectedStates.join(',')}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data);
      } catch (err) {
        console.error('Failed to fetch compare data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStates]);

  const getStateStats = (stateId: string) => {
    if (!data?.states[stateId]) {
      return { current: 0, yoyChange: 0 };
    }
    const stats = data.states[stateId];
    return {
      current: stats.currentHomeValue || 0,
      yoyChange: stats.homeValueYoyPct || 0,
    };
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

      {/* Error State */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State for Stats */}
      {loading && selectedStates.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedStates.map((stateId) => (
            <Card key={stateId}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison Table */}
      {!loading && !error && selectedStates.length > 0 && data && (
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
                    {stats.current > 0 ? formatCurrency(stats.current) : 'N/A'}
                  </div>
                  {stats.current > 0 && (
                    <p className={`text-sm ${stats.yoyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.yoyChange >= 0 ? '+' : ''}{stats.yoyChange.toFixed(1)}% YoY
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Loading State for Chart */}
      {loading && selectedStates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Home Value Comparison</CardTitle>
            <CardDescription>Loading data...</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      )}

      {/* Comparison Chart */}
      {!loading && !error && selectedStates.length > 0 && data && data.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Home Value Comparison</CardTitle>
            <CardDescription>
              Zillow Home Value Index (ZHVI) comparison - Last 10 years
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends}>
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
