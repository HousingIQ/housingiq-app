import { NextRequest, NextResponse } from 'next/server';
import { db, zhviValues } from '@/lib/db';
import { eq, and, gte, isNull } from 'drizzle-orm';

// Valid options for filters
const VALID_HOME_TYPES = ['All Homes', 'Single Family', 'Condo', 'Multi Family'];
const VALID_TIERS = ['Mid-Tier', 'Top-Tier', 'Bottom-Tier'];
const VALID_MONTHS = [12, 36, 60];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse filter parameters with defaults
    const homeType = searchParams.get('homeType') || 'All Homes';
    const tier = searchParams.get('tier') || 'Mid-Tier';
    const months = parseInt(searchParams.get('months') || '12', 10);

    // Validate parameters
    if (!VALID_HOME_TYPES.includes(homeType)) {
      return NextResponse.json(
        { error: `Invalid homeType. Valid options: ${VALID_HOME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Valid options: ${VALID_TIERS.join(', ')}` },
        { status: 400 }
      );
    }

    const validMonths = VALID_MONTHS.includes(months) ? months : 12;

    // Calculate date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - validMonths);
    const dateString = startDate.toISOString().split('T')[0];

    // Fetch home values (ZHVI)
    const homeValueResults = await db
      .select({
        date: zhviValues.date,
        value: zhviValues.value,
      })
      .from(zhviValues)
      .where(
        and(
          eq(zhviValues.regionId, regionId),
          eq(zhviValues.homeType, homeType),
          eq(zhviValues.tier, tier),
          eq(zhviValues.smoothed, true),
          eq(zhviValues.seasonallyAdjusted, true),
          isNull(zhviValues.bedrooms),
          gte(zhviValues.date, dateString)
        )
      )
      .orderBy(zhviValues.date);

    // Build trend data with MoM change
    const trendsWithChange = homeValueResults.map((item, index) => {
      const prevValue = index > 0 ? homeValueResults[index - 1].value : null;
      const momChangePct =
        prevValue && item.value
          ? ((item.value - prevValue) / prevValue) * 100
          : null;

      return {
        date: item.date,
        homeValue: item.value,
        momChangePct: momChangePct ? Math.round(momChangePct * 100) / 100 : null,
      };
    });

    return NextResponse.json({
      data: trendsWithChange,
      filters: {
        homeType,
        tier,
        months: validMonths,
      },
    });
  } catch (error) {
    console.error('Price trends error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
