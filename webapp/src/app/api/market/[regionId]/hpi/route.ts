import { NextRequest, NextResponse } from 'next/server';
import { db, fhfaHpi, regions } from '@/lib/db';
import { eq, and, gte } from 'drizzle-orm';

/**
 * FHFA HPI API route.
 *
 * Maps Zillow region IDs to FHFA place identifiers:
 * - States: FHFA uses 2-letter state abbreviation, Zillow uses numeric region_id
 *   -> We look up the region's state code from the regions table
 * - Metros (MSAs): FHFA uses CBSA codes, Zillow uses numeric region_id
 *   -> We try matching by FHFA place_id = Zillow region_id (CBSA codes often align)
 * - National: FHFA level = "USA"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId } = await params;
    const { searchParams } = new URL(request.url);

    const months = parseInt(searchParams.get('months') || '120', 10);
    const frequency = searchParams.get('frequency') || 'monthly';

    // Calculate date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const dateString = startDate.toISOString().split('T')[0];

    // Look up the region to determine geography level and state
    const regionResult = await db
      .select({
        regionId: regions.regionId,
        geographyLevel: regions.geographyLevel,
        state: regions.state,
        regionName: regions.regionName,
      })
      .from(regions)
      .where(eq(regions.regionId, regionId))
      .limit(1);

    if (regionResult.length === 0) {
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      );
    }

    const region = regionResult[0];

    // Build FHFA query based on geography level
    let hpiResults: {
      date: string | null;
      indexNsa: number | null;
      indexSa: number | null;
      level: string | null;
      placeName: string | null;
    }[];

    if (region.geographyLevel === 'National') {
      // National level: FHFA level = "USA"
      hpiResults = await db
        .select({
          date: fhfaHpi.date,
          indexNsa: fhfaHpi.indexNsa,
          indexSa: fhfaHpi.indexSa,
          level: fhfaHpi.level,
          placeName: fhfaHpi.placeName,
        })
        .from(fhfaHpi)
        .where(
          and(
            eq(fhfaHpi.level, 'USA'),
            eq(fhfaHpi.frequency, frequency),
            gte(fhfaHpi.date, dateString)
          )
        )
        .orderBy(fhfaHpi.date);
    } else if (region.geographyLevel === 'State') {
      // State level: match by state abbreviation
      if (!region.state) {
        return NextResponse.json({ data: [], meta: { regionId, message: 'No state code for region' } });
      }
      hpiResults = await db
        .select({
          date: fhfaHpi.date,
          indexNsa: fhfaHpi.indexNsa,
          indexSa: fhfaHpi.indexSa,
          level: fhfaHpi.level,
          placeName: fhfaHpi.placeName,
        })
        .from(fhfaHpi)
        .where(
          and(
            eq(fhfaHpi.level, 'State'),
            eq(fhfaHpi.placeId, region.state),
            eq(fhfaHpi.frequency, frequency),
            gte(fhfaHpi.date, dateString)
          )
        )
        .orderBy(fhfaHpi.date);
    } else if (region.geographyLevel === 'Metro') {
      // Metro level: try matching FHFA place_id = Zillow region_id (CBSA codes)
      hpiResults = await db
        .select({
          date: fhfaHpi.date,
          indexNsa: fhfaHpi.indexNsa,
          indexSa: fhfaHpi.indexSa,
          level: fhfaHpi.level,
          placeName: fhfaHpi.placeName,
        })
        .from(fhfaHpi)
        .where(
          and(
            eq(fhfaHpi.level, 'MSA'),
            eq(fhfaHpi.placeId, regionId),
            eq(fhfaHpi.frequency, frequency),
            gte(fhfaHpi.date, dateString)
          )
        )
        .orderBy(fhfaHpi.date);
    } else {
      // County/City: no direct FHFA match, try state-level fallback
      if (region.state) {
        hpiResults = await db
          .select({
            date: fhfaHpi.date,
            indexNsa: fhfaHpi.indexNsa,
            indexSa: fhfaHpi.indexSa,
            level: fhfaHpi.level,
            placeName: fhfaHpi.placeName,
          })
          .from(fhfaHpi)
          .where(
            and(
              eq(fhfaHpi.level, 'State'),
              eq(fhfaHpi.placeId, region.state),
              eq(fhfaHpi.frequency, frequency),
              gte(fhfaHpi.date, dateString)
            )
          )
          .orderBy(fhfaHpi.date);
      } else {
        hpiResults = [];
      }
    }

    return NextResponse.json({
      data: hpiResults,
      meta: {
        regionId,
        geographyLevel: region.geographyLevel,
        frequency,
        months,
        total: hpiResults.length,
      },
    });
  } catch (error) {
    console.error('HPI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
