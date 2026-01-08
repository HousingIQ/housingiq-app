import {
  pgTable,
  pgSchema,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  real,
  date,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// App schema for data platform tables
const appSchema = pgSchema('app');

// Users table for authentication (Google OAuth and email/password)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  passwordHash: varchar('password_hash', { length: 255 }),
  googleId: varchar('google_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Regions dimension table (geographic areas) - loaded by data platform
export const regions = appSchema.table('regions', {
  regionId: varchar('region_id', { length: 100 }).primaryKey(),
  regionName: varchar('region_name', { length: 255 }),
  displayName: varchar('display_name', { length: 500 }),
  geographyLevel: varchar('geography_level', { length: 50 }),
  state: varchar('state', { length: 2 }),
  stateName: varchar('state_name', { length: 100 }),
  city: varchar('city', { length: 255 }),
  county: varchar('county', { length: 255 }),
  metro: varchar('metro', { length: 255 }),
  sizeRank: integer('size_rank'),
});

// ZHVI Values fact table (home values over time) - loaded by data platform
export const zhviValues = appSchema.table('zhvi_values', {
  regionId: varchar('region_id', { length: 100 }),
  date: date('date'),
  value: real('value'),
  geographyLevel: varchar('geography_level', { length: 50 }),
  homeType: varchar('home_type', { length: 50 }),
  tier: varchar('tier', { length: 50 }),
  bedrooms: integer('bedrooms'),
  smoothed: boolean('smoothed'),
  seasonallyAdjusted: boolean('seasonally_adjusted'),
  frequency: varchar('frequency', { length: 20 }),
  momChangePct: real('mom_change_pct'),
  yoyChangePct: real('yoy_change_pct'),
});

// ZORI Values fact table (rent values over time) - loaded by data platform
export const zoriValues = appSchema.table('zori_values', {
  regionId: varchar('region_id', { length: 100 }),
  date: date('date'),
  value: real('value'),
  geographyLevel: varchar('geography_level', { length: 50 }),
  homeType: varchar('home_type', { length: 50 }),
  smoothed: boolean('smoothed'),
  seasonallyAdjusted: boolean('seasonally_adjusted'),
  frequency: varchar('frequency', { length: 20 }),
  momChangePct: real('mom_change_pct'),
  yoyChangePct: real('yoy_change_pct'),
});

// Market Summary table (pre-computed aggregates for dashboard) - loaded by data platform
export const marketSummary = appSchema.table('market_summary', {
  regionId: varchar('region_id', { length: 100 }).primaryKey(),
  regionName: varchar('region_name', { length: 255 }),
  displayName: varchar('display_name', { length: 500 }),
  geographyLevel: varchar('geography_level', { length: 50 }),
  stateCode: varchar('state_code', { length: 2 }),
  stateName: varchar('state_name', { length: 100 }),
  metro: varchar('metro', { length: 255 }),
  sizeRank: integer('size_rank'),
  currentHomeValue: real('current_home_value'),
  homeValueYoyPct: real('home_value_yoy_pct'),
  homeValueMomPct: real('home_value_mom_pct'),
  homeValueDate: date('home_value_date'),
  currentRentValue: real('current_rent_value'),
  rentYoyPct: real('rent_yoy_pct'),
  rentMomPct: real('rent_mom_pct'),
  rentValueDate: date('rent_value_date'),
  priceToRentRatio: real('price_to_rent_ratio'),
  grossRentYieldPct: real('gross_rent_yield_pct'),
  marketClassification: varchar('market_classification', { length: 20 }),
});

// Inventory Values fact table (for-sale inventory over time) - loaded by data platform
export const inventoryValues = appSchema.table('inventory_values', {
  regionId: varchar('region_id', { length: 100 }),
  date: date('date'),
  inventoryCount: integer('inventory_count'),
  geographyLevel: varchar('geography_level', { length: 50 }),
  homeType: varchar('home_type', { length: 50 }),
  smoothed: boolean('smoothed'),
  frequency: varchar('frequency', { length: 20 }),
  momChangePct: real('mom_change_pct'),
  yoyChangePct: real('yoy_change_pct'),
});

// Market Heat Index table (market temperature over time) - loaded by data platform
export const marketHeatIndex = appSchema.table('market_heat_index', {
  regionId: varchar('region_id', { length: 100 }),
  date: date('date'),
  heatIndex: real('heat_index'),
  geographyLevel: varchar('geography_level', { length: 50 }),
  momChange: real('mom_change'),
  yoyChange: real('yoy_change'),
  marketTemperature: varchar('market_temperature', { length: 20 }),
});

// Affordability Metrics table (mortgage payments, income needed) - loaded by data platform
export const affordabilityMetrics = appSchema.table('affordability_metrics', {
  regionId: varchar('region_id', { length: 100 }),
  date: date('date'),
  value: real('value'),
  geographyLevel: varchar('geography_level', { length: 50 }),
  metricType: varchar('metric_type', { length: 50 }),
  downPaymentPct: real('down_payment_pct'),
  momChangePct: real('mom_change_pct'),
  yoyChangePct: real('yoy_change_pct'),
});

// Relations
export const regionsRelations = relations(regions, ({ many }) => ({
  zhviValues: many(zhviValues),
  zoriValues: many(zoriValues),
}));

export const zhviValuesRelations = relations(zhviValues, ({ one }) => ({
  region: one(regions, {
    fields: [zhviValues.regionId],
    references: [regions.regionId],
  }),
}));

export const zoriValuesRelations = relations(zoriValues, ({ one }) => ({
  region: one(regions, {
    fields: [zoriValues.regionId],
    references: [regions.regionId],
  }),
}));

// Inventory relations
export const inventoryValuesRelations = relations(inventoryValues, ({ one }) => ({
  region: one(regions, {
    fields: [inventoryValues.regionId],
    references: [regions.regionId],
  }),
}));

// Market heat index relations
export const marketHeatIndexRelations = relations(marketHeatIndex, ({ one }) => ({
  region: one(regions, {
    fields: [marketHeatIndex.regionId],
    references: [regions.regionId],
  }),
}));

// Affordability metrics relations
export const affordabilityMetricsRelations = relations(affordabilityMetrics, ({ one }) => ({
  region: one(regions, {
    fields: [affordabilityMetrics.regionId],
    references: [regions.regionId],
  }),
}));

// Type exports for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
export type ZhviValue = typeof zhviValues.$inferSelect;
export type NewZhviValue = typeof zhviValues.$inferInsert;
export type ZoriValue = typeof zoriValues.$inferSelect;
export type NewZoriValue = typeof zoriValues.$inferInsert;
export type MarketSummary = typeof marketSummary.$inferSelect;
export type InventoryValue = typeof inventoryValues.$inferSelect;
export type NewInventoryValue = typeof inventoryValues.$inferInsert;
export type MarketHeatIndexValue = typeof marketHeatIndex.$inferSelect;
export type AffordabilityMetric = typeof affordabilityMetrics.$inferSelect;

