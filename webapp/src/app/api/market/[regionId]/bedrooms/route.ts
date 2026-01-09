import { NextRequest, NextResponse } from 'next/server';
import { db, zhviValues } from '@/lib/db';
import { eq, and, gte, desc, isNotNull } from 'drizzle-orm';

const BEDROOM_CONFIG = [
  { bedrooms: 1, key: 'bd1', label: '1 Bedroom', color: '#3b82f6' },
  { bedrooms: 2, key: 'bd2', label: '2 Bedroom', color: '#22c55e' },
  { bedrooms: 3, key: 'bd3', label: '3 Bedroom', color: '#f59e0b' },
  { bedrooms: 4, key: 'bd4', label: '4 Bedroom', color: '#ef4444' },
  { bedrooms: 5, key: 'bd5', label: '5+ Bedroom', color: '#8b5cf6' },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId } = await params;
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '36', 10);

    // Calculate date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const dateString = startDate.toISOString().split('T')[0];

    // Fetch data for all bedroom counts
    const results = await db
      .select({
        date: zhviValues.date,
        value: zhviValues.value,
        bedrooms: zhviValues.bedrooms,
        yoyChangePct: zhviValues.yoyChangePct,
      })
      .from(zhviValues)
      .where(
        and(
          eq(zhviValues.regionId, regionId),
          eq(zhviValues.homeType, 'All Homes'),
          eq(zhviValues.tier, 'Mid-Tier'),
          eq(zhviValues.smoothed, true),
          eq(zhviValues.seasonallyAdjusted, true),
          isNotNull(zhviValues.bedrooms),
          gte(zhviValues.date, dateString)
        )
      )
      .orderBy(zhviValues.date);

    if (results.length === 0) {
      return NextResponse.json({
        data: { trends: [], stats: [] },
      });
    }

    // Group by date
    const dateMap = new Map<string, Record<string, number>>();
    const latestByBedroom = new Map<number, { value: number; yoyChange: number | null; date: string }>();

    for (const row of results) {
      if (!row.date || row.value === null || row.bedrooms === null) continue;

      const dateKey = row.date;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }

      const bedroomKey = `bd${row.bedrooms}`;
      dateMap.get(dateKey)![bedroomKey] = row.value;

      // Track latest values for stats
      const existing = latestByBedroom.get(row.bedrooms);
      if (!existing || row.date > existing.date) {
        latestByBedroom.set(row.bedrooms, {
          value: row.value,
          yoyChange: row.yoyChangePct,
          date: row.date,
        });
      }
    }

    // Format trends
    const formatDate = (date: string) => {
      const d = new Date(date);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    };

    const trends = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        formattedDate: formatDate(date),
        ...values,
      }));

    // Format stats
    const stats = BEDROOM_CONFIG
      .filter((config) => latestByBedroom.has(config.bedrooms))
      .map((config) => {
        const data = latestByBedroom.get(config.bedrooms)!;
        return {
          bedrooms: config.bedrooms,
          label: config.label,
          currentValue: data.value,
          yoyChange: data.yoyChange,
          color: config.color,
        };
      });

    return NextResponse.json({
      data: { trends, stats },
    });
  } catch (error) {
    console.error('Bedrooms API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

