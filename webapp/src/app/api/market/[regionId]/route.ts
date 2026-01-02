import { NextRequest, NextResponse } from 'next/server';
import { db, marketSummary } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId } = await params;

    const result = await db
      .select()
      .from(marketSummary)
      .where(eq(marketSummary.regionId, regionId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result[0] });
  } catch (error) {
    console.error('Market overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
