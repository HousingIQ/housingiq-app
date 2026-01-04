import { NextRequest, NextResponse } from 'next/server';
import { db, zhviValues } from '@/lib/db';
import { eq, and, gte, isNull, inArray } from 'drizzle-orm';

const PROPERTY_CONFIG = [
  { homeType: 'Single Family', key: 'sfr', label: 'Single Family', icon: 'home', color: '#3b82f6' },
  { homeType: 'Condo', key: 'condo', label: 'Condo/Co-op', icon: 'building', color: '#f59e0b' },
  { homeType: 'All Homes', key: 'allHomes', label: 'All Homes', icon: 'home', color: '#6b7280' },
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

    // Fetch data for all property types
    const results = await db
      .select({
        date: zhviValues.date,
        value: zhviValues.value,
        homeType: zhviValues.homeType,
        yoyChangePct: zhviValues.yoyChangePct,
      })
      .from(zhviValues)
      .where(
        and(
          eq(zhviValues.regionId, regionId),
          inArray(zhviValues.homeType, ['Single Family', 'Condo', 'All Homes']),
          eq(zhviValues.tier, 'Mid-Tier'),
          eq(zhviValues.smoothed, true),
          eq(zhviValues.seasonallyAdjusted, true),
          isNull(zhviValues.bedrooms),
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
    const latestByType = new Map<string, { value: number; yoyChange: number | null; date: string }>();

    for (const row of results) {
      if (!row.date || row.value === null || !row.homeType) continue;

      const dateKey = row.date;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }

      const config = PROPERTY_CONFIG.find((c) => c.homeType === row.homeType);
      if (!config) continue;

      dateMap.get(dateKey)![config.key] = row.value;

      // Track latest values for stats
      const existing = latestByType.get(row.homeType);
      if (!existing || row.date > existing.date) {
        latestByType.set(row.homeType, {
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
    const stats = PROPERTY_CONFIG
      .filter((config) => latestByType.has(config.homeType))
      .map((config) => {
        const data = latestByType.get(config.homeType)!;
        return {
          type: config.key,
          label: config.label,
          icon: config.icon as 'home' | 'building',
          currentValue: data.value,
          yoyChange: data.yoyChange,
          color: config.color,
        };
      });

    return NextResponse.json({
      data: { trends, stats },
    });
  } catch (error) {
    console.error('Property types API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

