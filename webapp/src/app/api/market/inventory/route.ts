import { NextRequest, NextResponse } from 'next/server';
import { db, inventoryValues, regions } from '@/lib/db';
import { eq, and, gte, desc, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const geographyLevel = searchParams.get('geographyLevel') || 'Metro';
    const months = parseInt(searchParams.get('months') || '36', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Calculate date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const dateString = startDate.toISOString().split('T')[0];

    if (regionId) {
      // Get inventory for specific region
      const results = await db
        .select({
          date: inventoryValues.date,
          inventoryCount: inventoryValues.inventoryCount,
          momChangePct: inventoryValues.momChangePct,
          yoyChangePct: inventoryValues.yoyChangePct,
        })
        .from(inventoryValues)
        .where(
          and(
            eq(inventoryValues.regionId, regionId),
            eq(inventoryValues.smoothed, true),
            gte(inventoryValues.date, dateString)
          )
        )
        .orderBy(inventoryValues.date);

      // Format trends
      const formatDate = (date: string) => {
        const d = new Date(date);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      };

      const trends = results.map((row) => ({
        date: row.date,
        formattedDate: row.date ? formatDate(row.date) : '',
        inventoryCount: row.inventoryCount,
        momChangePct: row.momChangePct,
        yoyChangePct: row.yoyChangePct,
      }));

      // Calculate stats from latest data
      const latest = results[results.length - 1];
      const oneYearAgo = results.find((r) => {
        if (!r.date || !latest?.date) return false;
        const rDate = new Date(r.date);
        const latestDate = new Date(latest.date);
        latestDate.setFullYear(latestDate.getFullYear() - 1);
        return rDate.toISOString().split('T')[0] === latestDate.toISOString().split('T')[0];
      });

      const stats = {
        currentInventory: latest?.inventoryCount || null,
        yoyChangePct: latest?.yoyChangePct || null,
        momChangePct: latest?.momChangePct || null,
        inventoryOneYearAgo: oneYearAgo?.inventoryCount || null,
      };

      return NextResponse.json({
        data: { trends, stats },
      });
    }

    // Get national summary with top metros
    const nationalResults = await db
      .select({
        regionId: inventoryValues.regionId,
        inventoryCount: inventoryValues.inventoryCount,
        yoyChangePct: inventoryValues.yoyChangePct,
        date: inventoryValues.date,
      })
      .from(inventoryValues)
      .where(
        and(
          eq(inventoryValues.geographyLevel, geographyLevel),
          eq(inventoryValues.smoothed, true)
        )
      )
      .orderBy(desc(inventoryValues.date))
      .limit(1000);

    // Get latest data per region
    const latestByRegion = new Map<string, {
      inventoryCount: number;
      yoyChangePct: number | null;
      date: string;
    }>();

    for (const row of nationalResults) {
      if (!row.regionId || !row.date) continue;
      const existing = latestByRegion.get(row.regionId);
      if (!existing || row.date > existing.date) {
        latestByRegion.set(row.regionId, {
          inventoryCount: row.inventoryCount || 0,
          yoyChangePct: row.yoyChangePct,
          date: row.date,
        });
      }
    }

    // Get region names
    const regionIds = Array.from(latestByRegion.keys());
    const regionData = await db
      .select({
        regionId: regions.regionId,
        regionName: regions.regionName,
        state: regions.state,
        sizeRank: regions.sizeRank,
      })
      .from(regions)
      .where(inArray(regions.regionId, regionIds));

    const regionNameMap = new Map(
      regionData.map((r) => [r.regionId, { name: r.regionName, state: r.state, sizeRank: r.sizeRank }])
    );

    // Build summary
    const summary = Array.from(latestByRegion.entries())
      .map(([regionId, data]) => {
        const regionInfo = regionNameMap.get(regionId);
        return {
          regionId,
          regionName: regionInfo?.name || 'Unknown',
          state: regionInfo?.state,
          sizeRank: regionInfo?.sizeRank,
          inventoryCount: data.inventoryCount,
          yoyChangePct: data.yoyChangePct,
        };
      })
      .sort((a, b) => (a.sizeRank || 999) - (b.sizeRank || 999))
      .slice(0, limit);

    // Calculate totals
    const totalInventory = summary.reduce((sum, r) => sum + r.inventoryCount, 0);
    const avgYoyChange = summary
      .filter((r) => r.yoyChangePct !== null)
      .reduce((sum, r, _, arr) => sum + (r.yoyChangePct || 0) / arr.length, 0);

    return NextResponse.json({
      data: {
        summary,
        totals: {
          totalInventory,
          avgYoyChangePct: avgYoyChange,
          regionCount: summary.length,
        },
      },
    });
  } catch (error) {
    console.error('Inventory API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

