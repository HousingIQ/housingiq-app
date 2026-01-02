'use client';

import { useState, useEffect } from 'react';
import { MapPin, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface RegionResult {
  regionId: string;
  regionName: string;
  geographyLevel: string;
  state: string | null;
  stateName: string | null;
  metro: string | null;
  sizeRank: number | null;
}

interface LocationSearchBarProps {
  onSelect: (region: RegionResult) => void;
  placeholder?: string;
  className?: string;
}

// Geography level badge variants using shadcn semantic colors
const levelBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  National: 'default',
  State: 'secondary',
  Metro: 'outline',
  Zip: 'secondary',
};

export function LocationSearchBar({
  onSelect,
  placeholder = 'Search for a city, state, or metro area...',
  className,
}: LocationSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const [results, setResults] = useState<RegionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/regions/search?q=${encodeURIComponent(query)}&limit=10`
        );
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (region: RegionResult) => {
    setSelectedValue(getDisplayName(region));
    setOpen(false);
    setQuery('');
    onSelect(region);
  };

  const getDisplayName = (region: RegionResult) => {
    if (region.geographyLevel === 'State') {
      return region.stateName || region.regionName;
    }
    if (region.geographyLevel === 'Metro' && region.state) {
      return `${region.regionName}, ${region.state}`;
    }
    return region.regionName;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full max-w-md justify-start text-left font-normal',
            !selectedValue && 'text-muted-foreground',
            className
          )}
        >
          <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {selectedValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-md p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
            )}
            {!isLoading && results.length > 0 && (
              <CommandGroup>
                {results.map((region) => (
                  <CommandItem
                    key={region.regionId}
                    value={region.regionId}
                    onSelect={() => handleSelect(region)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-medium">
                          {getDisplayName(region)}
                        </div>
                        {region.metro && region.geographyLevel !== 'Metro' && (
                          <div className="text-sm text-muted-foreground">
                            {region.metro} Metro
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={levelBadgeVariant[region.geographyLevel] || 'secondary'}>
                      {region.geographyLevel}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {/* Pro upsell for ZIP codes */}
            <div className="flex items-center gap-2 border-t px-3 py-3 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>ZIP code search available with Pro</span>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
