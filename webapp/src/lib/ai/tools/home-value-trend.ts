import { tool } from "ai";
import { z } from "zod";
import { db, regions, zhviValues, marketSummary } from "@/lib/db";
import { eq, and, gte, isNull, ilike, or, sql } from "drizzle-orm";

export const getHomeValueTrend = tool({
  description:
    "Get home value (ZHVI) price trend for a location. Returns 24 months of monthly home value data along with current market summary. Use when users ask about housing prices, home values, price trends, or market conditions for a specific city, state, metro area, or zip code.",
  inputSchema: z.object({
    location: z
      .string()
      .describe(
        "Location name to search for (e.g., 'Austin, TX', 'New York', 'California', '90210')"
      ),
  }),
  execute: async ({ location }) => {
    const region = await findRegion(location);
    if (!region) {
      return { error: `No region found matching "${location}". Try a more specific city, state, or metro area name.` };
    }

    const months = 24;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const dateString = startDate.toISOString().split("T")[0];

    const [trendData, summary] = await Promise.all([
      db
        .select({
          date: zhviValues.date,
          value: zhviValues.value,
          momChangePct: zhviValues.momChangePct,
          yoyChangePct: zhviValues.yoyChangePct,
        })
        .from(zhviValues)
        .where(
          and(
            eq(zhviValues.regionId, region.regionId),
            eq(zhviValues.homeType, "All Homes"),
            eq(zhviValues.tier, "Mid-Tier"),
            eq(zhviValues.smoothed, true),
            eq(zhviValues.seasonallyAdjusted, true),
            isNull(zhviValues.bedrooms),
            gte(zhviValues.date, dateString!)
          )
        )
        .orderBy(zhviValues.date),
      db
        .select()
        .from(marketSummary)
        .where(eq(marketSummary.regionId, region.regionId))
        .limit(1),
    ]);

    const marketInfo = summary[0] ?? null;

    const trend = trendData.map((row) => ({
      date: row.date,
      homeValue: row.value,
      momChangePct: row.momChangePct != null ? Math.round(row.momChangePct * 100) / 100 : null,
      yoyChangePct: row.yoyChangePct != null ? Math.round(row.yoyChangePct * 100) / 100 : null,
    }));

    return {
      region: {
        regionId: region.regionId,
        name: region.displayName ?? region.regionName,
        geographyLevel: region.geographyLevel,
        state: region.stateName,
      },
      trend,
      summary: marketInfo
        ? {
            currentHomeValue: marketInfo.currentHomeValue,
            homeValueYoyPct: marketInfo.homeValueYoyPct != null
              ? Math.round(marketInfo.homeValueYoyPct * 100) / 100
              : null,
            homeValueMomPct: marketInfo.homeValueMomPct != null
              ? Math.round(marketInfo.homeValueMomPct * 100) / 100
              : null,
            currentRentValue: marketInfo.currentRentValue,
            rentYoyPct: marketInfo.rentYoyPct != null
              ? Math.round(marketInfo.rentYoyPct * 100) / 100
              : null,
            priceToRentRatio: marketInfo.priceToRentRatio != null
              ? Math.round(marketInfo.priceToRentRatio * 100) / 100
              : null,
            grossRentYieldPct: marketInfo.grossRentYieldPct != null
              ? Math.round(marketInfo.grossRentYieldPct * 100) / 100
              : null,
            marketClassification: marketInfo.marketClassification,
          }
        : null,
    };
  },
});

async function findRegion(query: string) {
  const results = await db
    .select({
      regionId: regions.regionId,
      regionName: regions.regionName,
      displayName: regions.displayName,
      geographyLevel: regions.geographyLevel,
      state: regions.state,
      stateName: regions.stateName,
      sizeRank: regions.sizeRank,
    })
    .from(regions)
    .where(
      or(
        ilike(regions.regionName, `%${query}%`),
        ilike(regions.displayName, `%${query}%`),
        ilike(regions.stateName, `%${query}%`),
        ilike(regions.metro, `%${query}%`)
      )
    )
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
    .limit(1);

  return results[0] ?? null;
}
