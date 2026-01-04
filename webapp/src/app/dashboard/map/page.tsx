'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { scaleSequential } from 'd3-scale';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

// Dynamically import react-simple-maps to avoid SSR issues with React 19
const ComposableMap = dynamic(
  () => import('react-simple-maps').then((mod) => mod.ComposableMap),
  { ssr: false }
);
const Geographies = dynamic(
  () => import('react-simple-maps').then((mod) => mod.Geographies),
  { ssr: false }
);
const Geography = dynamic(
  () => import('react-simple-maps').then((mod) => mod.Geography),
  { ssr: false }
);
const ZoomableGroup = dynamic(
  () => import('react-simple-maps').then((mod) => mod.ZoomableGroup),
  { ssr: false }
);

// US states GeoJSON URL
const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

// State FIPS to state name mapping (matching the regionName in database)
const FIPS_TO_STATE_NAME: Record<string, string> = {
  '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas', '06': 'California',
  '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware', '11': 'District of Columbia', '12': 'Florida',
  '13': 'Georgia', '15': 'Hawaii', '16': 'Idaho', '17': 'Illinois', '18': 'Indiana',
  '19': 'Iowa', '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
  '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota', '28': 'Mississippi',
  '29': 'Missouri', '30': 'Montana', '31': 'Nebraska', '32': 'Nevada', '33': 'New Hampshire',
  '34': 'New Jersey', '35': 'New Mexico', '36': 'New York', '37': 'North Carolina', '38': 'North Dakota',
  '39': 'Ohio', '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
  '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas', '49': 'Utah',
  '50': 'Vermont', '51': 'Virginia', '53': 'Washington', '54': 'West Virginia', '55': 'Wisconsin',
  '56': 'Wyoming',
};

interface MarketData {
  regionId: string;
  regionName: string | null;
  displayName: string | null;
  stateCode: string | null;
  stateName: string | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  currentRentValue: number | null;
  rentYoyPct: number | null;
  priceToRentRatio: number | null;
  grossRentYieldPct: number | null;
  marketClassification: string | null;
}

const METRICS = [
  { value: 'homeValueYoyPct', label: 'Home Value YoY%', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
  { value: 'rentYoyPct', label: 'Rent YoY%', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
  { value: 'grossRentYieldPct', label: 'Rent Yield%', format: (v: number) => `${v.toFixed(1)}%` },
  { value: 'currentHomeValue', label: 'Home Value', format: (v: number) => formatCurrency(v) },
];

// Color scales for different metrics
function getColorScale(metric: string, data: MarketData[]) {
  const values = data
    .map((d) => d[metric as keyof MarketData] as number)
    .filter((v) => v !== null && !isNaN(v));

  if (values.length === 0) return () => '#e5e7eb';

  const min = Math.min(...values);
  const max = Math.max(...values);

  // For YoY metrics, center around 0
  if (metric.includes('Yoy')) {
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    return scaleSequential()
      .domain([-absMax, absMax])
      .interpolator((t: number) => {
        // Red for negative, green for positive
        if (t < 0.5) {
          const intensity = 1 - t * 2;
          return `rgb(${220 + intensity * 35}, ${38 + intensity * 60}, ${38 + intensity * 60})`;
        } else {
          const intensity = (t - 0.5) * 2;
          return `rgb(${22 + intensity * 30}, ${163 + intensity * 30}, ${74 + intensity * 30})`;
        }
      });
  }

  // For other metrics, use a blue scale
  return scaleSequential()
    .domain([min, max])
    .interpolator((t: number) => {
      const r = Math.round(239 - t * 200);
      const g = Math.round(246 - t * 150);
      const b = Math.round(255 - t * 20);
      return `rgb(${r}, ${g}, ${b})`;
    });
}

export default function MapPage() {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState('homeValueYoyPct');
  const [hoveredState, setHoveredState] = useState<MarketData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    // Small delay to ensure dynamic imports are loaded
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/market/all?geographyLevel=State');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data);
      } catch (err) {
        console.error('Failed to fetch map data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create a map of state name to data
  const stateDataMap = useMemo(() => {
    const map = new Map<string, MarketData>();
    data.forEach((d) => {
      if (d.regionName) {
        map.set(d.regionName, d);
      }
    });
    return map;
  }, [data]);

  // Get color scale for current metric
  const colorScale = useMemo(() => {
    return getColorScale(metric, data);
  }, [metric, data]);

  // Get color for a state
  const getStateColor = (stateName: string) => {
    const stateData = stateDataMap.get(stateName);
    if (!stateData) return '#e5e7eb';

    const value = stateData[metric as keyof MarketData] as number;
    if (value === null || isNaN(value)) return '#e5e7eb';

    return colorScale(value);
  };

  const handleMouseEnter = (geoId: string, event: React.MouseEvent) => {
    const stateName = FIPS_TO_STATE_NAME[geoId];
    const stateData = stateDataMap.get(stateName);
    if (stateData) {
      setHoveredState(stateData);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
  };

  const currentMetricConfig = METRICS.find((m) => m.value === metric);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Market Map</h1>
        <p className="text-gray-500 mt-1">
          Visualize housing market data across the United States
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Metric</Label>
            <div className="flex flex-wrap gap-2">
              {METRICS.map((m) => (
                <Button
                  key={m.value}
                  variant={metric === m.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMetric(m.value)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
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

      {/* Map Error State */}
      {mapError && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-6 flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-600">{mapError}</p>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle>US Housing Market</CardTitle>
          <CardDescription>
            {currentMetricConfig?.label} by State - Hover for details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(loading || !mapReady) ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <div className="relative">
              <ComposableMap
                projection="geoAlbersUsa"
                style={{ width: '100%', height: '500px' }}
              >
                <ZoomableGroup>
                  <Geographies 
                    geography={GEO_URL}
                    parseGeographies={(geos) => {
                      // Filter out any invalid geographies
                      return geos.filter((g) => g.id && FIPS_TO_STATE_NAME[g.id]);
                    }}
                  >
                    {({ geographies }) => {
                      if (!geographies || geographies.length === 0) {
                        setMapError('Failed to load map data. Please refresh the page.');
                        return null;
                      }
                      
                      return geographies.map((geo) => {
                        const stateName = FIPS_TO_STATE_NAME[geo.id];
                        if (!stateName) return null;
                        
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={getStateColor(stateName)}
                            stroke="#ffffff"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: 'none' },
                              hover: { outline: 'none', fill: '#3b82f6', cursor: 'pointer' },
                              pressed: { outline: 'none' },
                            }}
                            onMouseEnter={(event) => handleMouseEnter(geo.id, event)}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                          />
                        );
                      });
                    }}
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>

              {/* Tooltip */}
              {hoveredState && (
                <div
                  className="fixed z-50 bg-white border rounded-lg shadow-lg p-3 pointer-events-none"
                  style={{
                    left: tooltipPosition.x + 10,
                    top: tooltipPosition.y + 10,
                  }}
                >
                  <p className="font-bold text-gray-900">{hoveredState.regionName}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-600">
                      Home Value:{' '}
                      <span className="font-medium">
                        {hoveredState.currentHomeValue
                          ? formatCurrency(hoveredState.currentHomeValue)
                          : 'N/A'}
                      </span>
                    </p>
                    <p className="text-gray-600">
                      YoY Change:{' '}
                      <span
                        className={`font-medium ${
                          hoveredState.homeValueYoyPct && hoveredState.homeValueYoyPct >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {hoveredState.homeValueYoyPct
                          ? `${hoveredState.homeValueYoyPct >= 0 ? '+' : ''}${hoveredState.homeValueYoyPct.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </p>
                    <p className="text-gray-600">
                      Rent:{' '}
                      <span className="font-medium">
                        {hoveredState.currentRentValue
                          ? formatCurrency(hoveredState.currentRentValue)
                          : 'N/A'}
                      </span>
                    </p>
                    <p className="text-gray-600">
                      Rent Yield:{' '}
                      <span className="font-medium">
                        {hoveredState.grossRentYieldPct
                          ? `${hoveredState.grossRentYieldPct.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border">
                <p className="text-sm font-medium mb-2">{currentMetricConfig?.label}</p>
                <div className="flex items-center gap-1">
                  {metric.includes('Yoy') ? (
                    <>
                      <div className="w-16 h-4 rounded" style={{ background: 'linear-gradient(to right, #dc2626, #fef08a, #16a34a)' }} />
                      <div className="flex justify-between w-16 text-xs text-gray-500">
                        <span>-</span>
                        <span>0</span>
                        <span>+</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-4 rounded" style={{ background: 'linear-gradient(to right, #eff6ff, #2563eb)' }} />
                      <div className="flex justify-between w-16 text-xs text-gray-500">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      {!loading && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>State Data</CardTitle>
            <CardDescription>
              Detailed market data for all states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">State</th>
                    <th className="text-right py-2 px-3 font-medium">Home Value</th>
                    <th className="text-right py-2 px-3 font-medium">YoY %</th>
                    <th className="text-right py-2 px-3 font-medium">Rent</th>
                    <th className="text-right py-2 px-3 font-medium">Yield %</th>
                    <th className="text-right py-2 px-3 font-medium">P/R Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {data
                    .slice()
                    .sort((a, b) => (b.currentHomeValue || 0) - (a.currentHomeValue || 0))
                    .map((state) => (
                      <tr key={state.regionId} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{state.regionName}</td>
                        <td className="text-right py-2 px-3">
                          {state.currentHomeValue ? formatCurrency(state.currentHomeValue) : 'N/A'}
                        </td>
                        <td className={`text-right py-2 px-3 ${
                          state.homeValueYoyPct && state.homeValueYoyPct >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {state.homeValueYoyPct 
                            ? `${state.homeValueYoyPct >= 0 ? '+' : ''}${state.homeValueYoyPct.toFixed(1)}%`
                            : 'N/A'}
                        </td>
                        <td className="text-right py-2 px-3">
                          {state.currentRentValue ? formatCurrency(state.currentRentValue) : 'N/A'}
                        </td>
                        <td className="text-right py-2 px-3">
                          {state.grossRentYieldPct ? `${state.grossRentYieldPct.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="text-right py-2 px-3">
                          {state.priceToRentRatio ? `${state.priceToRentRatio.toFixed(1)}x` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
