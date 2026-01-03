import { NextRequest, NextResponse } from 'next/server';
import { db, regions, zhviValues, marketSummary } from '@/lib/db';
import { eq, and, inArray, isNull, gte } from 'drizzle-orm';

// State abbreviation to full name mapping
const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida',
  GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana',
  IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming',
};

// Color palette for states
const stateColors: Record<string, string> = {
  CA: '#2563eb',
  TX: '#16a34a',
  FL: '#dc2626',
  NY: '#9333ea',
  WA: '#ea580c',
  CO: '#0891b2',
  AZ: '#db2777',
  NC: '#65a30d',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stateAbbrs = searchParams.get('states')?.split(',').filter(Boolean) || [];

    if (stateAbbrs.length === 0) {
      return NextResponse.json(
        { error: 'At least one state is required' },
        { status: 400 }
      );
    }

    // Convert abbreviations to full state names
    const stateNames = stateAbbrs
      .map((abbr) => STATE_ABBR_TO_NAME[abbr])
      .filter(Boolean);

    if (stateNames.length === 0) {
      return NextResponse.json(
        { error: 'Invalid state abbreviations' },
        { status: 400 }
      );
    }

    // Find region IDs for state-level regions by regionName
    const stateRegions = await db
      .select({
        regionId: regions.regionId,
        regionName: regions.regionName,
      })
      .from(regions)
      .where(
        and(
          eq(regions.geographyLevel, 'State'),
          inArray(regions.regionName, stateNames)
        )
      );

    if (stateRegions.length === 0) {
      return NextResponse.json(
        { error: 'No regions found for the specified states' },
        { status: 404 }
      );
    }

    // Create mapping from regionName to abbreviation
    const nameToAbbr = Object.fromEntries(
      Object.entries(STATE_ABBR_TO_NAME).map(([abbr, name]) => [name, abbr])
    );

    const regionIds = stateRegions.map((r) => r.regionId);

    // Get market summary data for current values
    const summaryResults = await db
      .select({
        regionId: marketSummary.regionId,
        regionName: marketSummary.regionName,
        currentHomeValue: marketSummary.currentHomeValue,
        homeValueYoyPct: marketSummary.homeValueYoyPct,
      })
      .from(marketSummary)
      .where(inArray(marketSummary.regionId, regionIds));

    // Create state stats from market summary, keyed by abbreviation
    const stateStats: Record<string, {
      regionId: string;
      stateCode: string;
      stateName: string | null;
      currentHomeValue: number | null;
      homeValueYoyPct: number | null;
      color: string;
    }> = {};

    for (const r of summaryResults) {
      const abbr = nameToAbbr[r.regionName || ''];
      if (abbr) {
        stateStats[abbr] = {
          regionId: r.regionId,
          stateCode: abbr,
          stateName: r.regionName,
          currentHomeValue: r.currentHomeValue,
          homeValueYoyPct: r.homeValueYoyPct,
          color: stateColors[abbr] || '#6b7280',
        };
      }
    }

    // Get historical data for the last 10 years
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const dateString = tenYearsAgo.toISOString().split('T')[0];

    // Fetch home values (ZHVI) for all selected regions
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
          eq(zhviValues.homeType, 'All Homes'),
          eq(zhviValues.tier, 'Mid-Tier'),
          eq(zhviValues.smoothed, true),
          eq(zhviValues.seasonallyAdjusted, true),
          isNull(zhviValues.bedrooms),
          gte(zhviValues.date, dateString)
        )
      )
      .orderBy(zhviValues.date);

    // Create a map of regionId to state abbreviation
    const regionIdToAbbr = new Map<string, string>();
    for (const r of stateRegions) {
      const abbr = nameToAbbr[r.regionName || ''];
      if (abbr) {
        regionIdToAbbr.set(r.regionId, abbr);
      }
    }

    // Group values by date
    const valuesByDate = new Map<string, Record<string, number>>();

    for (const row of homeValueResults) {
      if (!row.date || !row.value || !row.regionId) continue;

      const stateAbbr = regionIdToAbbr.get(row.regionId);
      if (!stateAbbr) continue;

      const dateKey = row.date;
      if (!valuesByDate.has(dateKey)) {
        valuesByDate.set(dateKey, {});
      }
      valuesByDate.get(dateKey)![stateAbbr] = row.value;
    }

    // Convert to array format for chart
    const trends = Array.from(valuesByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => {
        const d = new Date(date);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          date,
          formattedDate: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          ...values,
        };
      });

    return NextResponse.json({
      data: {
        states: stateStats,
        trends,
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
