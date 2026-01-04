'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Lock, Loader2, Search, Building2, Map, Home, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface LocationSearchBarProps {
  onSelect: (region: RegionResult) => void;
  placeholder?: string;
  className?: string;
}

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

export function LocationSearchBar({
  onSelect,
  placeholder: _placeholder,
  className,
}: LocationSearchBarProps) {
  const [activeTab, setActiveTab] = useState<string>('State');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RegionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const activeConfig = GEOGRAPHY_TABS.find(t => t.id === activeTab) || GEOGRAPHY_TABS[0];

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
    if (activeConfig.locked) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchResults(query, activeTab);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTab, activeConfig.locked, fetchResults]);

  // Load initial results when tab changes
  useEffect(() => {
    if (!activeConfig.locked && query.length < 2) {
      fetchResults('', activeTab);
    }
  }, [activeTab, activeConfig.locked, fetchResults, query.length]);

  const handleSelect = (region: RegionResult) => {
    setQuery('');
    setIsFocused(false);
    onSelect(region);
  };

  const handleTabChange = (tabId: string) => {
    const tab = GEOGRAPHY_TABS.find(t => t.id === tabId);
    if (tab?.locked) return;
    setActiveTab(tabId);
    setQuery('');
  };

  const getDisplayName = (region: RegionResult) => {
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

  return (
    <div className={cn('w-full', className)}>
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="pl-9 pr-4"
            disabled={activeConfig.locked}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results Dropdown */}
        {isFocused && !activeConfig.locked && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
            {/* Results List */}
            <div className="max-h-[320px] overflow-y-auto p-1">
              {results.length === 0 && !isLoading && query.length >= 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No {activeConfig.label.toLowerCase()} found for &quot;{query}&quot;
                </div>
              )}
              {results.length === 0 && !isLoading && query.length < 2 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {query.length === 0 
                    ? `Popular ${activeConfig.label.toLowerCase()}` 
                    : 'Type at least 2 characters to search'}
                </div>
              )}
              {results.map((region) => {
                const subtitle = getSubtitle(region);
                return (
                  <button
                    key={region.regionId}
                    onClick={() => handleSelect(region)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left hover:bg-accent transition-colors"
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

            {/* Footer hint */}
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              {results.length > 0 
                ? `${results.length} result${results.length > 1 ? 's' : ''} • Click to select`
                : 'Start typing to search'}
            </div>
          </div>
        )}

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

      {/* Quick Stats */}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className={cn('h-2 w-2 rounded-full', 'bg-blue-500')} />
          50 States
        </span>
        <span className="flex items-center gap-1">
          <span className={cn('h-2 w-2 rounded-full', 'bg-emerald-500')} />
          900+ Metros
        </span>
        <span className="flex items-center gap-1">
          <span className={cn('h-2 w-2 rounded-full', 'bg-orange-500')} />
          3,000+ Counties
        </span>
      </div>
    </div>
  );
}
