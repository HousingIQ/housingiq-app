import { NextRequest, NextResponse } from 'next/server';
import { db, regions } from '@/lib/db';
import { ilike, or, and, inArray, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Only allow Metro and State levels (ZIP locked for Pro)
    const allowedLevels = ['Metro', 'State', 'National'];

    const results = await db
      .select({
        regionId: regions.regionId,
        regionName: regions.regionName,
        geographyLevel: regions.geographyLevel,
        state: regions.state,
        stateName: regions.stateName,
        metro: regions.metro,
        sizeRank: regions.sizeRank,
      })
      .from(regions)
      .where(
        and(
          inArray(regions.geographyLevel, allowedLevels),
          or(
            ilike(regions.regionName, `%${query}%`),
            ilike(regions.stateName, `%${query}%`),
            ilike(regions.metro, `%${query}%`)
          )
        )
      )
      .orderBy(
        sql`CASE WHEN ${regions.geographyLevel} = 'National' THEN 1
                 WHEN ${regions.geographyLevel} = 'State' THEN 2
                 WHEN ${regions.geographyLevel} = 'Metro' THEN 3
                 ELSE 4 END`,
        sql`${regions.sizeRank} NULLS LAST`
      )
      .limit(limit);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Region search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
