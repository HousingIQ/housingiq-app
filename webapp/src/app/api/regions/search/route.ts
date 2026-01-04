import { NextRequest, NextResponse } from 'next/server';
import { db, regions } from '@/lib/db';
import { ilike, or, and, eq, sql } from 'drizzle-orm';

// Valid geography levels
const VALID_LEVELS = ['National', 'State', 'Metro', 'County', 'City', 'Zip'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const geographyLevel = searchParams.get('level') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);

    // If no query but level specified, return top results for that level
    if (query.length < 1 && geographyLevel) {
      if (!VALID_LEVELS.includes(geographyLevel)) {
        return NextResponse.json({ results: [] });
      }

      const results = await db
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
          sizeRank: regions.sizeRank,
        })
        .from(regions)
        .where(eq(regions.geographyLevel, geographyLevel))
        .orderBy(sql`${regions.sizeRank} NULLS LAST`)
        .limit(limit);

      return NextResponse.json({ results });
    }

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Build where clause based on geography level filter
    let whereClause;
    
    if (geographyLevel && VALID_LEVELS.includes(geographyLevel)) {
      // Search within specific geography level
      whereClause = and(
        eq(regions.geographyLevel, geographyLevel),
        or(
          ilike(regions.regionName, `%${query}%`),
          ilike(regions.displayName, `%${query}%`),
          ilike(regions.stateName, `%${query}%`),
          ilike(regions.city, `%${query}%`),
          ilike(regions.county, `%${query}%`),
          ilike(regions.metro, `%${query}%`)
        )
      );
    } else {
      // Search across all levels (default: only Metro and State)
      whereClause = and(
        or(
          eq(regions.geographyLevel, 'State'),
          eq(regions.geographyLevel, 'Metro'),
          eq(regions.geographyLevel, 'National')
        ),
        or(
          ilike(regions.regionName, `%${query}%`),
          ilike(regions.displayName, `%${query}%`),
          ilike(regions.stateName, `%${query}%`),
          ilike(regions.metro, `%${query}%`)
        )
      );
    }

    const results = await db
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
        sizeRank: regions.sizeRank,
      })
      .from(regions)
      .where(whereClause)
      .orderBy(
        sql`CASE WHEN ${regions.geographyLevel} = 'National' THEN 1
                 WHEN ${regions.geographyLevel} = 'State' THEN 2
                 WHEN ${regions.geographyLevel} = 'Metro' THEN 3
                 WHEN ${regions.geographyLevel} = 'County' THEN 4
                 WHEN ${regions.geographyLevel} = 'City' THEN 5
                 WHEN ${regions.geographyLevel} = 'Zip' THEN 6
                 ELSE 7 END`,
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
