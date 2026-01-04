import { NextRequest, NextResponse } from 'next/server';
import { db, regions, zhviValues, zoriValues, marketSummary } from '@/lib/db';
import { and, inArray, isNull, gte, eq } from 'drizzle-orm';

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

// Valid filter options
const VALID_HOME_TYPES = ['All Homes', 'Single Family', 'Condo', 'Multi Family'];
const VALID_TIERS = ['Mid-Tier', 'Top-Tier', 'Bottom-Tier'];
const VALID_MONTHS = [12, 36, 60, 120]; // 1Y, 3Y, 5Y, 10Y

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionIds = searchParams.get('regions')?.split(',').filter(Boolean) || [];

    // Parse filter parameters with defaults
    const homeType = searchParams.get('homeType') || 'All Homes';
    const tier = searchParams.get('tier') || 'Mid-Tier';
    const months = parseInt(searchParams.get('months') || '60', 10);

    if (regionIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one region is required' },
        { status: 400 }
      );
    }

    if (regionIds.length > 8) {
      return NextResponse.json(
        { error: 'Maximum 8 regions allowed' },
        { status: 400 }
      );
    }

    // Validate filters
    const validHomeType = VALID_HOME_TYPES.includes(homeType) ? homeType : 'All Homes';
    const validTier = VALID_TIERS.includes(tier) ? tier : 'Mid-Tier';
    const validMonths = VALID_MONTHS.includes(months) ? months : 60;

    // Get region info
    const regionData = await db
      .select({
        regionId: regions.regionId,
        regionName: regions.regionName,
        displayName: regions.displayName,
        geographyLevel: regions.geographyLevel,
        state: regions.state,
        stateName: regions.stateName,
        city: regions.city,
        county: regions.county,
        metro: regions.metro,
      })
      .from(regions)
      .where(inArray(regions.regionId, regionIds));

    if (regionData.length === 0) {
      return NextResponse.json(
        { error: 'No regions found for the specified IDs' },
        { status: 404 }
      );
    }

    // Get market summary data for current values
    const summaryResults = await db
      .select({
        regionId: marketSummary.regionId,
        regionName: marketSummary.regionName,
        displayName: marketSummary.displayName,
        geographyLevel: marketSummary.geographyLevel,
        currentHomeValue: marketSummary.currentHomeValue,
        homeValueYoyPct: marketSummary.homeValueYoyPct,
        homeValueMomPct: marketSummary.homeValueMomPct,
        currentRentValue: marketSummary.currentRentValue,
        rentYoyPct: marketSummary.rentYoyPct,
        priceToRentRatio: marketSummary.priceToRentRatio,
        marketClassification: marketSummary.marketClassification,
      })
      .from(marketSummary)
      .where(inArray(marketSummary.regionId, regionIds));

    // Create region stats with colors
    const regionStats: Record<string, {
      regionId: string;
      regionName: string | null;
      displayName: string | null;
      geographyLevel: string | null;
      state: string | null;
      stateName: string | null;
      city: string | null;
      county: string | null;
      metro: string | null;
      currentHomeValue: number | null;
      homeValueYoyPct: number | null;
      homeValueMomPct: number | null;
      currentRentValue: number | null;
      rentYoyPct: number | null;
      priceToRentRatio: number | null;
      marketClassification: string | null;
      color: string;
    }> = {};

    // Match region data with summary data
    let colorIndex = 0;
    for (const region of regionData) {
      const summary = summaryResults.find(s => s.regionId === region.regionId);
      regionStats[region.regionId] = {
        regionId: region.regionId,
        regionName: region.regionName,
        displayName: region.displayName,
        geographyLevel: region.geographyLevel,
        state: region.state,
        stateName: region.stateName,
        city: region.city,
        county: region.county,
        metro: region.metro,
        currentHomeValue: summary?.currentHomeValue || null,
        homeValueYoyPct: summary?.homeValueYoyPct || null,
        homeValueMomPct: summary?.homeValueMomPct || null,
        currentRentValue: summary?.currentRentValue || null,
        rentYoyPct: summary?.rentYoyPct || null,
        priceToRentRatio: summary?.priceToRentRatio || null,
        marketClassification: summary?.marketClassification || null,
        color: COMPARISON_COLORS[colorIndex % COMPARISON_COLORS.length],
      };
      colorIndex++;
    }

    // Calculate date range based on months parameter
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - validMonths);
    const dateString = startDate.toISOString().split('T')[0];

    // Fetch home values (ZHVI) for all selected regions with filters
    const homeValueResults = await db
      .select({
        regionId: zhviValues.regionId,
        date: zhviValues.date,
        value: zhviValues.value,
      })
      .from(zhviValues)
      .where(
        and(
          inArray(zhviValues.regionId, regionIds),
          eq(zhviValues.homeType, validHomeType),
          eq(zhviValues.tier, validTier),
          eq(zhviValues.smoothed, true),
          eq(zhviValues.seasonallyAdjusted, true),
          isNull(zhviValues.bedrooms),
          gte(zhviValues.date, dateString)
        )
      )
      .orderBy(zhviValues.date);

    // Fetch rent values (ZORI) for all selected regions
    // Note: ZORI doesn't have tier, and typically only has "All Homes"
    const rentValueResults = await db
      .select({
        regionId: zoriValues.regionId,
        date: zoriValues.date,
        value: zoriValues.value,
      })
      .from(zoriValues)
      .where(
        and(
          inArray(zoriValues.regionId, regionIds),
          eq(zoriValues.homeType, 'All Homes'),
          eq(zoriValues.smoothed, true),
          eq(zoriValues.seasonallyAdjusted, true),
          gte(zoriValues.date, dateString)
        )
      )
      .orderBy(zoriValues.date);

    // Group home values by date
    const homeValuesByDate = new Map<string, Record<string, number>>();
    for (const row of homeValueResults) {
      if (!row.date || !row.value || !row.regionId) continue;
      const dateKey = row.date;
      if (!homeValuesByDate.has(dateKey)) {
        homeValuesByDate.set(dateKey, {});
      }
      homeValuesByDate.get(dateKey)![row.regionId] = row.value;
    }

    // Group rent values by date
    const rentValuesByDate = new Map<string, Record<string, number>>();
    for (const row of rentValueResults) {
      if (!row.date || !row.value || !row.regionId) continue;
      const dateKey = row.date;
      if (!rentValuesByDate.has(dateKey)) {
        rentValuesByDate.set(dateKey, {});
      }
      rentValuesByDate.get(dateKey)![row.regionId] = row.value;
    }

    // Get all unique dates
    const allDates = new Set([
      ...homeValuesByDate.keys(),
      ...rentValuesByDate.keys(),
    ]);

    // Convert to array format for charts
    const formatDate = (date: string) => {
      const d = new Date(date);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Home value trends
    const homeValueTrends = Array.from(homeValuesByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        formattedDate: formatDate(date),
        ...values,
      }));

    // Rent value trends
    const rentTrends = Array.from(rentValuesByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        formattedDate: formatDate(date),
        ...values,
      }));

    // Calculate P/R Ratio trends (home value / (rent * 12))
    const priceToRentTrends = Array.from(allDates)
      .sort()
      .map((date) => {
        const homeValues = homeValuesByDate.get(date) || {};
        const rentValues = rentValuesByDate.get(date) || {};
        
        const ratios: Record<string, number> = {};
        for (const regionId of regionIds) {
          const homeValue = homeValues[regionId];
          const rentValue = rentValues[regionId];
          if (homeValue && rentValue && rentValue > 0) {
            ratios[regionId] = Math.round((homeValue / (rentValue * 12)) * 10) / 10;
          }
        }
        
        // Only include dates where at least one region has data
        if (Object.keys(ratios).length === 0) return null;
        
        return {
          date,
          formattedDate: formatDate(date),
          ...ratios,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      data: {
        regions: regionStats,
        homeValueTrends,
        rentTrends,
        priceToRentTrends,
        filters: {
          homeType: validHomeType,
          tier: validTier,
          months: validMonths,
        },
      },
    });
  } catch (error) {
    console.error('Compare API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
