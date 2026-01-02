import { NextRequest, NextResponse } from 'next/server';
import { db, zhviValues, zoriValues } from '@/lib/db';
import { eq, and, gte, isNull } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId } = await params;

    // Get last 12 months of data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const dateString = twelveMonthsAgo.toISOString().split('T')[0];

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
          eq(zhviValues.homeType, 'All Homes'),
          eq(zhviValues.tier, 'Mid-Tier'),
          eq(zhviValues.smoothed, true),
          eq(zhviValues.seasonallyAdjusted, true),
          isNull(zhviValues.bedrooms),
          gte(zhviValues.date, dateString)
        )
      )
      .orderBy(zhviValues.date);

    // Fetch rent values (ZORI)
    const rentResults = await db
      .select({
        date: zoriValues.date,
        value: zoriValues.value,
      })
      .from(zoriValues)
      .where(
        and(
          eq(zoriValues.regionId, regionId),
          eq(zoriValues.homeType, 'All Homes'),
          eq(zoriValues.smoothed, true),
          eq(zoriValues.seasonallyAdjusted, true),
          gte(zoriValues.date, dateString)
        )
      )
      .orderBy(zoriValues.date);

    // Create a map of rent values by date
    const rentByDate = new Map(
      rentResults.map((r) => [r.date, r.value])
    );

    // Merge home values with rent values
    const trendsWithChange = homeValueResults.map((item, index) => {
      const prevValue = index > 0 ? homeValueResults[index - 1].value : null;
      const momChangePct =
        prevValue && item.value
          ? ((item.value - prevValue) / prevValue) * 100
          : null;

      return {
        date: item.date,
        homeValue: item.value,
        rentValue: rentByDate.get(item.date!) ?? null,
        momChangePct: momChangePct ? Math.round(momChangePct * 100) / 100 : null,
      };
    });

    return NextResponse.json({ data: trendsWithChange });
  } catch (error) {
    console.error('Price trends error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
