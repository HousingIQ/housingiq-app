import { NextResponse } from 'next/server';
import { db, marketSummary } from '@/lib/db';
import { sql, count, max } from 'drizzle-orm';

export async function GET() {
  try {
    const [regionCounts, latestDates, marketHealth] = await Promise.all([
      db
        .select({
          geographyLevel: marketSummary.geographyLevel,
          count: count(),
        })
        .from(marketSummary)
        .groupBy(marketSummary.geographyLevel),

      db
        .select({
          latestHomeValueDate: max(marketSummary.homeValueDate),
          latestRentValueDate: max(marketSummary.rentValueDate),
        })
        .from(marketSummary),

      db
        .select({
          classification: marketSummary.marketClassification,
          count: count(),
        })
        .from(marketSummary)
        .where(
          sql`${marketSummary.geographyLevel} IN ('State', 'Metro', 'County', 'City')`
        )
        .groupBy(marketSummary.marketClassification),
    ]);

    const counts: Record<string, number> = {};
    for (const row of regionCounts) {
      if (row.geographyLevel) {
        counts[row.geographyLevel] = row.count;
      }
    }

    const health: Record<string, number> = {};
    for (const row of marketHealth) {
      if (row.classification) {
        health[row.classification] = row.count;
      }
    }

    return NextResponse.json({
      data: {
        regionCounts: counts,
        totalRegions: Object.values(counts).reduce((a, b) => a + b, 0),
        latestHomeValueDate: latestDates[0]?.latestHomeValueDate ?? null,
        latestRentValueDate: latestDates[0]?.latestRentValueDate ?? null,
        marketHealth: health,
      },
    });
  } catch (error) {
    console.error('Market stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
