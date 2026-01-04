'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Lock, Loader2, Search, Building2, Map, Home, Hash, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface SelectedRegion {
  regionId: string;
  regionName: string;
  displayName: string | null;
  geographyLevel: string;
  state: string | null;
  stateName: string | null;
  city: string | null;
  county: string | null;
  metro: string | null;
  sizeRank: number | null;
  color: string;
}

interface RegionResult {
  regionId: string;
  regionName: string;
  displayName: string | null;
  geographyLevel: string;
  state: string | null;
  stateName: string | null;
  city: string | null;
  county: string | null;
  metro: string | null;
  sizeRank: number | null;
}

interface RegionComparePickerProps {
  selectedRegions: SelectedRegion[];
  onRegionsChange: (regions: SelectedRegion[]) => void;
  maxRegions?: number;
  className?: string;
}

// Color palette for comparison lines
const COMPARISON_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#dc2626', // Red
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#65a30d', // Lime
];

// Geography level configuration
const GEOGRAPHY_TABS = [
  { 
    id: 'State', 
    label: 'States', 
    icon: Map,
    placeholder: 'Search states...',
    locked: false,
  },
  { 
    id: 'Metro', 
    label: 'Metros', 
    icon: Building2,
    placeholder: 'Search metro areas...',
    locked: false,
  },
  { 
    id: 'County', 
    label: 'Counties', 
    icon: MapPin,
    placeholder: 'Search counties...',
    locked: false,
  },
  { 
    id: 'City', 
    label: 'Cities', 
    icon: Home,
    placeholder: 'Search cities...',
    locked: false,
  },
  { 
    id: 'Zip', 
    label: 'ZIP Codes', 
    icon: Hash,
    placeholder: 'Search ZIP codes...',
    locked: true,
  },
] as const;

// Badge colors per geography level
const levelColors: Record<string, string> = {
  National: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  State: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Metro: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  County: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  City: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  Zip: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function RegionComparePicker({
  selectedRegions,
  onRegionsChange,
  maxRegions = 4,
  className,
}: RegionComparePickerProps) {
  const [activeTab, setActiveTab] = useState<string>('State');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RegionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const activeConfig = GEOGRAPHY_TABS.find(t => t.id === activeTab) || GEOGRAPHY_TABS[0];
  const canAddMore = selectedRegions.length < maxRegions;

  // Get next available color
  const getNextColor = (): string => {
    const usedColors = new Set(selectedRegions.map(r => r.color));
    return COMPARISON_COLORS.find(c => !usedColors.has(c)) || COMPARISON_COLORS[0];
  };

  // Fetch results when query or tab changes
  const fetchResults = useCallback(async (searchQuery: string, level: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ level });
      if (searchQuery.length >= 2) {
        params.set('q', searchQuery);
      }
      params.set('limit', '12');
      
      const response = await fetch(`/api/regions/search?${params}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!isOpen || activeConfig.locked) {
      return;
    }

    const timer = setTimeout(() => {
      fetchResults(query, activeTab);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTab, activeConfig.locked, fetchResults, isOpen]);

  // Load initial results when opening or switching tabs
  useEffect(() => {
    if (isOpen && !activeConfig.locked && query.length < 2) {
      fetchResults('', activeTab);
    }
  }, [activeTab, activeConfig.locked, fetchResults, query.length, isOpen]);

  const handleSelect = (region: RegionResult) => {
    // Check if already selected
    if (selectedRegions.some(r => r.regionId === region.regionId)) {
      return;
    }

    const newRegion: SelectedRegion = {
      ...region,
      color: getNextColor(),
    };

    onRegionsChange([...selectedRegions, newRegion]);
    setQuery('');
    
    // Close if we've hit the max
    if (selectedRegions.length + 1 >= maxRegions) {
      setIsOpen(false);
    }
  };

  const handleRemove = (regionId: string) => {
    onRegionsChange(selectedRegions.filter(r => r.regionId !== regionId));
  };

  const handleTabChange = (tabId: string) => {
    const tab = GEOGRAPHY_TABS.find(t => t.id === tabId);
    if (tab?.locked) return;
    setActiveTab(tabId);
    setQuery('');
  };

  const getDisplayName = (region: RegionResult | SelectedRegion) => {
    if (region.displayName) return region.displayName;
    if (region.geographyLevel === 'State') {
      return region.stateName || region.regionName;
    }
    if (region.geographyLevel === 'Metro' && region.state) {
      return `${region.regionName}, ${region.state}`;
    }
    if (region.geographyLevel === 'County' && region.state) {
      return `${region.county || region.regionName}, ${region.state}`;
    }
    if (region.geographyLevel === 'City' && region.state) {
      return `${region.city || region.regionName}, ${region.state}`;
    }
    return region.regionName;
  };

  const getSubtitle = (region: RegionResult) => {
    if (region.geographyLevel === 'Metro') return null;
    if (region.metro) return `${region.metro} Metro`;
    if (region.stateName && region.geographyLevel !== 'State') return region.stateName;
    return null;
  };

  // Filter out already selected regions
  const filteredResults = results.filter(
    r => !selectedRegions.some(sr => sr.regionId === r.regionId)
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Selected Regions Display */}
      <div className="flex flex-wrap gap-2">
        {selectedRegions.map((region) => (
          <div
            key={region.regionId}
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-sm"
            style={{ borderColor: region.color, backgroundColor: `${region.color}10` }}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: region.color }}
            />
            <span className="font-medium">{getDisplayName(region)}</span>
            <Badge 
              variant="secondary" 
              className={cn('text-[10px] px-1.5 py-0', levelColors[region.geographyLevel])}
            >
              {region.geographyLevel}
            </Badge>
            <button
              onClick={() => handleRemove(region.regionId)}
              className="ml-1 rounded-full p-0.5 hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        ))}

        {/* Add Region Button */}
        {canAddMore && !isOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="gap-1.5 rounded-full"
          >
            <Plus className="h-4 w-4" />
            Add Region
          </Button>
        )}
      </div>

      {/* Region Picker Card */}
      {isOpen && canAddMore && (
        <Card>
          <CardContent className="pt-4">
            {/* Geography Type Tabs */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {GEOGRAPHY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isLocked = tab.locked;

                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTabChange(tab.id)}
                    disabled={isLocked}
                    className={cn(
                      'gap-1.5 text-xs',
                      isLocked && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {isLocked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                    {tab.label}
                    {isLocked && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                        PRO
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={activeConfig.placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 pr-4"
                  disabled={activeConfig.locked}
                  autoFocus
                />
                {isLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Locked state overlay */}
              {activeConfig.locked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>ZIP code search available with Pro plan</span>
                  </div>
                </div>
              )}
            </div>

            {/* Results List */}
            {!activeConfig.locked && (
              <div className="mt-2 max-h-[240px] overflow-y-auto rounded-md border">
                {filteredResults.length === 0 && !isLoading && query.length >= 2 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No {activeConfig.label.toLowerCase()} found for &quot;{query}&quot;
                  </div>
                )}
                {filteredResults.length === 0 && !isLoading && query.length < 2 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    {query.length === 0 
                      ? `Popular ${activeConfig.label.toLowerCase()}` 
                      : 'Type at least 2 characters to search'}
                  </div>
                )}
                {filteredResults.map((region) => {
                  const subtitle = getSubtitle(region);
                  return (
                    <button
                      key={region.regionId}
                      onClick={() => handleSelect(region)}
                      className="flex w-full items-center justify-between gap-3 border-b last:border-b-0 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {getDisplayName(region)}
                          </div>
                          {subtitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              {subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn('shrink-0 text-xs', levelColors[region.geographyLevel])}
                      >
                        {region.geographyLevel}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedRegions.length}/{maxRegions} regions selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedRegions.length === 0 && !isOpen && (
        <div className="text-center py-6 text-muted-foreground">
          <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No regions selected</p>
          <p className="text-xs mt-1">Click &quot;Add Region&quot; to start comparing</p>
        </div>
      )}
    </div>
  );
}

export { COMPARISON_COLORS };

