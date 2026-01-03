import { NextRequest, NextResponse } from 'next/server';
import { db, marketSummary } from '@/lib/db';
import { eq, desc, asc, sql } from 'drizzle-orm';

// Valid sort columns
const VALID_SORT_COLUMNS = [
  'homeValueYoyPct',
  'rentYoyPct',
  'grossRentYieldPct',
  'priceToRentRatio',
  'currentHomeValue',
  'currentRentValue',
];

// Valid geography levels
const VALID_GEOGRAPHY_LEVELS = ['State', 'Metro', 'City'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse parameters
    const sortBy = searchParams.get('sortBy') || 'homeValueYoyPct';
    const order = searchParams.get('order') || 'desc';
    const geographyLevel = searchParams.get('geographyLevel') || 'State';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Validate parameters
    if (!VALID_SORT_COLUMNS.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sortBy. Valid options: ${VALID_SORT_COLUMNS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!VALID_GEOGRAPHY_LEVELS.includes(geographyLevel)) {
      return NextResponse.json(
        { error: `Invalid geographyLevel. Valid options: ${VALID_GEOGRAPHY_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }

    // Build query
    const sortColumn = marketSummary[sortBy as keyof typeof marketSummary];
    const orderFn = order === 'asc' ? asc : desc;

    const results = await db
      .select({
        regionId: marketSummary.regionId,
        regionName: marketSummary.regionName,
        displayName: marketSummary.displayName,
        geographyLevel: marketSummary.geographyLevel,
        stateCode: marketSummary.stateCode,
        stateName: marketSummary.stateName,
        metro: marketSummary.metro,
        currentHomeValue: marketSummary.currentHomeValue,
        homeValueYoyPct: marketSummary.homeValueYoyPct,
        currentRentValue: marketSummary.currentRentValue,
        rentYoyPct: marketSummary.rentYoyPct,
        priceToRentRatio: marketSummary.priceToRentRatio,
        grossRentYieldPct: marketSummary.grossRentYieldPct,
        marketClassification: marketSummary.marketClassification,
      })
      .from(marketSummary)
      .where(eq(marketSummary.geographyLevel, geographyLevel))
      .orderBy(orderFn(sortColumn as ReturnType<typeof sql>))
      .limit(limit);

    // Add rank numbers
    const rankedResults = results.map((row, index) => ({
      rank: index + 1,
      ...row,
    }));

    return NextResponse.json({
      data: rankedResults,
      meta: {
        sortBy,
        order,
        geographyLevel,
        total: rankedResults.length,
      },
    });
  } catch (error) {
    console.error('Rankings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
