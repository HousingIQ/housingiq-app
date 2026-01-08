import { NextRequest, NextResponse } from 'next/server';
import { db, marketHeatIndex, regions } from '@/lib/db';
import { eq, desc, asc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const regionId = searchParams.get('regionId');
    const months = parseInt(searchParams.get('months') || '24', 10);

    // If specific region requested, return trend data
    if (regionId) {
      const trends = await db
        .select({
          date: marketHeatIndex.date,
          heatIndex: marketHeatIndex.heatIndex,
          momChange: marketHeatIndex.momChange,
          yoyChange: marketHeatIndex.yoyChange,
          marketTemperature: marketHeatIndex.marketTemperature,
        })
        .from(marketHeatIndex)
        .where(eq(marketHeatIndex.regionId, regionId))
        .orderBy(desc(marketHeatIndex.date))
        .limit(months);

      return NextResponse.json({
        data: trends.reverse(),
        meta: { regionId, months },
      });
    }

    // Get latest date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${marketHeatIndex.date})` })
      .from(marketHeatIndex);
    
    const latestDate = latestDateResult[0]?.maxDate;

    if (!latestDate) {
      return NextResponse.json({
        data: [],
        hottest: [],
        coolest: [],
        summary: { avgHeatIndex: 0, totalRegions: 0, hotMarkets: 0, coldMarkets: 0 },
        meta: { dataSource: 'database', status: 'no_data' },
      });
    }

    // Get latest heat index values with region names
    const latestData = await db
      .select({
        regionId: marketHeatIndex.regionId,
        regionName: regions.regionName,
        displayName: regions.displayName,
        date: marketHeatIndex.date,
        heatIndex: marketHeatIndex.heatIndex,
        momChange: marketHeatIndex.momChange,
        yoyChange: marketHeatIndex.yoyChange,
        marketTemperature: marketHeatIndex.marketTemperature,
        geographyLevel: marketHeatIndex.geographyLevel,
      })
      .from(marketHeatIndex)
      .leftJoin(regions, eq(marketHeatIndex.regionId, regions.regionId))
      .where(eq(marketHeatIndex.date, latestDate))
      .orderBy(desc(marketHeatIndex.heatIndex))
      .limit(limit);

    // Calculate hottest and coolest
    const hottest = [...latestData].slice(0, 10);
    const coolest = [...latestData].sort((a, b) => (a.heatIndex || 0) - (b.heatIndex || 0)).slice(0, 10);

    // Calculate summary stats
    const validData = latestData.filter(d => d.heatIndex !== null);
    const avgHeatIndex = validData.length > 0
      ? Math.round(validData.reduce((sum, d) => sum + (d.heatIndex || 0), 0) / validData.length)
      : 0;
    const hotMarkets = validData.filter(d => (d.heatIndex || 0) >= 60).length;
    const coldMarkets = validData.filter(d => (d.heatIndex || 0) < 40).length;

    return NextResponse.json({
      data: latestData,
      hottest,
      coolest,
      summary: {
        avgHeatIndex,
        totalRegions: validData.length,
        hotMarkets,
        coldMarkets,
        latestDate,
      },
      meta: {
        limit,
        dataSource: 'database',
      },
    });
  } catch (error) {
    console.error('Market Heat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
