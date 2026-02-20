'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { scaleSequential } from 'd3-scale';
import { geoCentroid } from 'd3-geo';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ArrowUpDown, Info } from 'lucide-react';

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
const Marker = dynamic(
  () => import('react-simple-maps').then((mod) => mod.Marker),
  { ssr: false }
);
const Annotation = dynamic(
  () => import('react-simple-maps').then((mod) => mod.Annotation),
  { ssr: false }
);

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

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

const FIPS_TO_STATE_ABBR: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
};

const OFFSET_LABELS: Record<string, { dx: number; dy: number }> = {
  VT: { dx: 35, dy: -18 },
  NH: { dx: 34, dy: 2 },
  MA: { dx: 36, dy: -1 },
  RI: { dx: 28, dy: 2 },
  CT: { dx: 35, dy: 10 },
  NJ: { dx: 34, dy: 1 },
  DE: { dx: 33, dy: 0 },
  MD: { dx: 47, dy: 10 },
  DC: { dx: 36, dy: 21 },
  HI: { dx: -10, dy: 25 },
  FL: { dx: 20, dy: 18 },
};

interface MarketData {
  regionId: string;
  regionName: string | null;
  displayName: string | null;
  stateCode: string | null;
  stateName: string | null;
  currentHomeValue: number | null;
  homeValueYoyPct: number | null;
  homeValueMomPct: number | null;
  marketClassification: string | null;
}

const METRICS = [
  { value: 'homeValueYoyPct', label: 'Home Value YoY%', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
  { value: 'currentHomeValue', label: 'Home Value', format: (v: number) => formatCurrency(v) },
];

const CLASSIFICATION_STYLES: Record<string, { bg: string; text: string }> = {
  Hot: { bg: 'bg-red-100', text: 'text-red-700' },
  Warm: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Cold: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

type SortKey = 'regionName' | 'currentHomeValue' | 'homeValueYoyPct' | 'homeValueMomPct' | 'marketClassification';

function getColorScale(metric: string, data: MarketData[]) {
  const values = data
    .map((d) => d[metric as keyof MarketData] as number)
    .filter((v) => v !== null && !isNaN(v));

  if (values.length === 0) return () => '#e5e7eb';

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (metric === 'homeValueYoyPct') {
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    return scaleSequential()
      .domain([-absMax, absMax])
      .interpolator((t: number) => {
        if (t < 0.5) {
          const intensity = 1 - t * 2;
          const r = Math.round(220 + intensity * 35);
          const g = Math.round(80 - intensity * 40);
          const b = Math.round(60 - intensity * 20);
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          const intensity = (t - 0.5) * 2;
          const r = Math.round(74 - intensity * 40);
          const g = Math.round(163 + intensity * 50);
          const b = Math.round(74 - intensity * 20);
          return `rgb(${r}, ${g}, ${b})`;
        }
      });
  }

  // Home Value: warm sequential palette (light cream to deep teal)
  return scaleSequential()
    .domain([min, max])
    .interpolator((t: number) => {
      const r = Math.round(240 - t * 210);
      const g = Math.round(245 - t * 120);
      const b = Math.round(230 - t * 60);
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
  const [sortKey, setSortKey] = useState<SortKey>('currentHomeValue');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
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

  const stateDataMap = useMemo(() => {
    const map = new Map<string, MarketData>();
    data.forEach((d) => {
      if (d.regionName) {
        map.set(d.regionName, d);
      }
    });
    return map;
  }, [data]);

  const colorScale = useMemo(() => {
    return getColorScale(metric, data);
  }, [metric, data]);

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

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDesc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortDesc(key !== 'regionName');
    }
  }, [sortKey]);

  const sortedData = useMemo(() => {
    return data.slice().sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal as string)
        : (aVal as number) - (bVal as number);
      return sortDesc ? -cmp : cmp;
    });
  }, [data, sortKey, sortDesc]);

  const currentMetricConfig = METRICS.find((m) => m.value === metric);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Market Map</h1>
        <p className="text-gray-500 mt-1">
          Visualize housing market data across the United States
        </p>
      </div>

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

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-6">
            <p className="text-red-600 text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {mapError && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-6 flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-600">{mapError}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>US Housing Market</CardTitle>
          <CardDescription>
            {currentMetricConfig?.label} by State &mdash; Hover for details
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
                      return geos.filter((g) => g.id && FIPS_TO_STATE_NAME[g.id]);
                    }}
                  >
                    {({ geographies }) => {
                      if (!geographies || geographies.length === 0) {
                        setMapError('Failed to load map data. Please refresh the page.');
                        return null;
                      }

                      return (
                        <>
                          {geographies.map((geo) => {
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
                          })}
                          {geographies.map((geo) => {
                            const abbr = FIPS_TO_STATE_ABBR[geo.id];
                            if (!abbr) return null;
                            const centroid = geoCentroid(geo) as [number, number];
                            const offset = OFFSET_LABELS[abbr];

                            if (offset) {
                              return (
                                <Annotation
                                  key={`label-${geo.id}`}
                                  subject={centroid}
                                  dx={offset.dx}
                                  dy={offset.dy}
                                  connectorProps={{}}
                                >
                                  <text
                                    x={4}
                                    textAnchor="start"
                                    alignmentBaseline="middle"
                                    style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                                  >
                                    {abbr}
                                  </text>
                                </Annotation>
                              );
                            }

                            return (
                              <Marker key={`label-${geo.id}`} coordinates={centroid}>
                                <text
                                  textAnchor="middle"
                                  alignmentBaseline="middle"
                                  style={{
                                    fontSize: 11,
                                    fill: '#334155',
                                    fontWeight: 600,
                                    pointerEvents: 'none',
                                  }}
                                >
                                  {abbr}
                                </text>
                              </Marker>
                            );
                          })}
                        </>
                      );
                    }}
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>

              {hoveredState && (
                <div
                  className="fixed z-50 bg-white border rounded-lg shadow-xl p-4 pointer-events-none min-w-[200px]"
                  style={{
                    left: tooltipPosition.x + 12,
                    top: tooltipPosition.y + 12,
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-bold text-gray-900">{hoveredState.regionName}</p>
                    {hoveredState.marketClassification && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CLASSIFICATION_STYLES[hoveredState.marketClassification]?.bg ?? 'bg-gray-100'} ${CLASSIFICATION_STYLES[hoveredState.marketClassification]?.text ?? 'text-gray-600'}`}>
                        {hoveredState.marketClassification}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Home Value</span>
                      <span className="font-medium text-gray-900">
                        {hoveredState.currentHomeValue
                          ? formatCurrency(hoveredState.currentHomeValue)
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">YoY Change</span>
                      <span
                        className={`font-medium ${
                          hoveredState.homeValueYoyPct != null && hoveredState.homeValueYoyPct >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {hoveredState.homeValueYoyPct != null
                          ? `${hoveredState.homeValueYoyPct >= 0 ? '+' : ''}${hoveredState.homeValueYoyPct.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">MoM Change</span>
                      <span
                        className={`font-medium ${
                          hoveredState.homeValueMomPct != null && hoveredState.homeValueMomPct >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {hoveredState.homeValueMomPct != null
                          ? `${hoveredState.homeValueMomPct >= 0 ? '+' : ''}${hoveredState.homeValueMomPct.toFixed(2)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border shadow-sm">
                <p className="text-xs font-semibold text-gray-700 mb-1.5">{currentMetricConfig?.label}</p>
                {metric === 'homeValueYoyPct' ? (
                  <div className="flex flex-col gap-0.5">
                    <div className="w-24 h-3 rounded" style={{ background: 'linear-gradient(to right, #dc2626, #fef08a, #16a34a)' }} />
                    <div className="flex justify-between w-24 text-[10px] text-gray-500">
                      <span>Decline</span>
                      <span>0</span>
                      <span>Growth</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <div className="w-24 h-3 rounded" style={{ background: 'linear-gradient(to right, #f0f5e6, #1e7d5a)' }} />
                    <div className="flex justify-between w-24 text-[10px] text-gray-500">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Classification Legend */}
      <Card className="bg-gray-50/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Market Classification</p>
              <p className="text-xs text-gray-500 mb-3">Based on year-over-year home value change</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Hot</span>
                  <span className="text-gray-600">&gt; 10% YoY &mdash; prices rising fast</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Warm</span>
                  <span className="text-gray-600">3&ndash;10% YoY &mdash; moderate growth</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Cold</span>
                  <span className="text-gray-600">&lt; 3% YoY &mdash; slow growth or declining</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!loading && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>State Data</CardTitle>
            <CardDescription>
              Click column headers to sort
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <SortableHeader label="State" sortKey="regionName" currentKey={sortKey} desc={sortDesc} onSort={handleSort} align="left" />
                    <SortableHeader label="Home Value" sortKey="currentHomeValue" currentKey={sortKey} desc={sortDesc} onSort={handleSort} />
                    <SortableHeader label="YoY %" sortKey="homeValueYoyPct" currentKey={sortKey} desc={sortDesc} onSort={handleSort} />
                    <SortableHeader label="MoM %" sortKey="homeValueMomPct" currentKey={sortKey} desc={sortDesc} onSort={handleSort} />
                    <SortableHeader label="Market" sortKey="marketClassification" currentKey={sortKey} desc={sortDesc} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((state) => (
                    <tr key={state.regionId} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 font-medium">{state.regionName}</td>
                      <td className="text-right py-2.5 px-3">
                        {state.currentHomeValue != null ? formatCurrency(state.currentHomeValue) : 'N/A'}
                      </td>
                      <td className={`text-right py-2.5 px-3 font-medium ${
                        state.homeValueYoyPct != null && state.homeValueYoyPct >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {state.homeValueYoyPct != null
                          ? `${state.homeValueYoyPct >= 0 ? '+' : ''}${state.homeValueYoyPct.toFixed(1)}%`
                          : 'N/A'}
                      </td>
                      <td className={`text-right py-2.5 px-3 font-medium ${
                        state.homeValueMomPct != null && state.homeValueMomPct >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {state.homeValueMomPct != null
                          ? `${state.homeValueMomPct >= 0 ? '+' : ''}${state.homeValueMomPct.toFixed(2)}%`
                          : 'N/A'}
                      </td>
                      <td className="text-right py-2.5 px-3">
                        {state.marketClassification ? (
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${CLASSIFICATION_STYLES[state.marketClassification]?.bg ?? 'bg-gray-100'} ${CLASSIFICATION_STYLES[state.marketClassification]?.text ?? 'text-gray-600'}`}>
                            {state.marketClassification}
                          </span>
                        ) : 'N/A'}
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

function SortableHeader({
  label,
  sortKey,
  currentKey,
  desc,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  desc: boolean;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className={`py-2.5 px-3 font-medium cursor-pointer select-none hover:bg-gray-100 transition-colors ${align === 'left' ? 'text-left' : 'text-right'}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {align === 'right' && (
          <ArrowUpDown className={`h-3 w-3 ${active ? 'text-gray-900' : 'text-gray-400'}`} />
        )}
        <span className={active ? 'text-gray-900' : ''}>{label}</span>
        {align === 'left' && (
          <ArrowUpDown className={`h-3 w-3 ${active ? 'text-gray-900' : 'text-gray-400'}`} />
        )}
        {active && <span className="text-[10px] text-gray-400">{desc ? '↓' : '↑'}</span>}
      </span>
    </th>
  );
}
