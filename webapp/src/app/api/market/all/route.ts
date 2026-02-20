import { NextRequest, NextResponse } from 'next/server';
import { db, marketSummary } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const geographyLevel = searchParams.get('geographyLevel') || 'State';

    const results = await db
      .select({
        regionId: marketSummary.regionId,
        regionName: marketSummary.regionName,
        displayName: marketSummary.displayName,
        stateCode: marketSummary.stateCode,
        stateName: marketSummary.stateName,
        currentHomeValue: marketSummary.currentHomeValue,
        homeValueYoyPct: marketSummary.homeValueYoyPct,
        homeValueMomPct: marketSummary.homeValueMomPct,
        marketClassification: marketSummary.marketClassification,
      })
      .from(marketSummary)
      .where(eq(marketSummary.geographyLevel, geographyLevel));

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Market all API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
