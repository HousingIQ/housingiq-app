import { NextRequest, NextResponse } from 'next/server';
import { db, affordabilityMetrics, regions } from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const geographyLevel = searchParams.get('geographyLevel') || 'Metro';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Get latest date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${affordabilityMetrics.date})` })
      .from(affordabilityMetrics);
    
    const latestDate = latestDateResult[0]?.maxDate;

    if (!latestDate) {
      return NextResponse.json({
        data: [],
        summary: null,
        meta: { dataSource: 'database', status: 'no_data' },
      });
    }

    // If specific region requested
    if (regionId) {
      // Get all metrics for this region
      const metrics = await db
        .select({
          date: affordabilityMetrics.date,
          value: affordabilityMetrics.value,
          metricType: affordabilityMetrics.metricType,
          downPaymentPct: affordabilityMetrics.downPaymentPct,
          momChangePct: affordabilityMetrics.momChangePct,
          yoyChangePct: affordabilityMetrics.yoyChangePct,
        })
        .from(affordabilityMetrics)
        .where(
          and(
            eq(affordabilityMetrics.regionId, regionId),
            eq(affordabilityMetrics.date, latestDate)
          )
        );

      // Get region info
      const regionInfo = await db
        .select({
          regionId: regions.regionId,
          regionName: regions.regionName,
          displayName: regions.displayName,
        })
        .from(regions)
        .where(eq(regions.regionId, regionId))
        .limit(1);

      // Group metrics by type
      const mortgagePayments = metrics.filter(m => m.metricType === 'mortgage_payment');
      const totalPayments = metrics.filter(m => m.metricType === 'total_monthly_payment');
      const homeownerIncome = metrics.find(m => m.metricType === 'homeowner_income_needed');
      const renterIncome = metrics.find(m => m.metricType === 'renter_income_needed');

      return NextResponse.json({
        region: regionInfo[0] || null,
        data: {
          mortgagePayments: mortgagePayments.map(m => ({
            downPaymentPct: m.downPaymentPct,
            monthlyPayment: m.value,
            yoyChangePct: m.yoyChangePct,
          })),
          totalPayments: totalPayments.map(m => ({
            downPaymentPct: m.downPaymentPct,
            monthlyPayment: m.value,
            yoyChangePct: m.yoyChangePct,
          })),
          homeownerIncomeNeeded: homeownerIncome?.value || null,
          homeownerIncomeYoy: homeownerIncome?.yoyChangePct || null,
          renterIncomeNeeded: renterIncome?.value || null,
          renterIncomeYoy: renterIncome?.yoyChangePct || null,
        },
        meta: { regionId, latestDate },
      });
    }

    // Get summary for multiple regions
    const latestData = await db
      .select({
        regionId: affordabilityMetrics.regionId,
        regionName: regions.regionName,
        displayName: regions.displayName,
        metricType: affordabilityMetrics.metricType,
        downPaymentPct: affordabilityMetrics.downPaymentPct,
        value: affordabilityMetrics.value,
        yoyChangePct: affordabilityMetrics.yoyChangePct,
      })
      .from(affordabilityMetrics)
      .leftJoin(regions, eq(affordabilityMetrics.regionId, regions.regionId))
      .where(
        and(
          eq(affordabilityMetrics.date, latestDate),
          eq(affordabilityMetrics.geographyLevel, geographyLevel),
          eq(affordabilityMetrics.metricType, 'homeowner_income_needed')
        )
      )
      .orderBy(desc(affordabilityMetrics.value))
      .limit(limit);

    return NextResponse.json({
      data: latestData,
      meta: {
        latestDate,
        geographyLevel,
        limit,
        dataSource: 'database',
      },
    });
  } catch (error) {
    console.error('Affordability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
