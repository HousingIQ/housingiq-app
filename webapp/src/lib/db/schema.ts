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

// FHFA House Price Index table (long-term appreciation data) - loaded by data platform
export const fhfaHpi = appSchema.table('fhfa_hpi', {
  level: varchar('level', { length: 50 }),
  placeName: varchar('place_name', { length: 255 }),
  placeId: varchar('place_id', { length: 50 }),
  date: date('date'),
  indexNsa: real('index_nsa'),
  indexSa: real('index_sa'),
  hpiType: varchar('hpi_type', { length: 50 }),
  frequency: varchar('frequency', { length: 20 }),
});

// Relations
export const regionsRelations = relations(regions, ({ many }) => ({
  zhviValues: many(zhviValues),
}));

export const zhviValuesRelations = relations(zhviValues, ({ one }) => ({
  region: one(regions, {
    fields: [zhviValues.regionId],
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
export type MarketSummary = typeof marketSummary.$inferSelect;
export type FhfaHpi = typeof fhfaHpi.$inferSelect;

