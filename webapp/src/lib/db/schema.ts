import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  real,
  date,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table for Google OAuth authentication
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  googleId: varchar('google_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Regions dimension table (geographic areas)
export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  regionId: varchar('region_id', { length: 100 }).notNull().unique(),
  regionIdOriginal: integer('region_id_original'),
  regionName: varchar('region_name', { length: 255 }).notNull(),
  state: varchar('state', { length: 2 }),
  stateName: varchar('state_name', { length: 100 }),
  city: varchar('city', { length: 255 }),
  county: varchar('county', { length: 255 }),
  metro: varchar('metro', { length: 255 }),
  geographyLevel: varchar('geography_level', { length: 50 }).notNull(),
  regionType: varchar('region_type', { length: 50 }),
  sizeRank: integer('size_rank'),
  stateCodeFips: integer('state_code_fips'),
  municipalCodeFips: integer('municipal_code_fips'),
}, (table) => [
  index('idx_regions_geography_level').on(table.geographyLevel),
  index('idx_regions_state').on(table.state),
  index('idx_regions_region_id').on(table.regionId),
]);

// ZHVI Values fact table (home values over time)
export const zhviValues = pgTable('zhvi_values', {
  id: serial('id').primaryKey(),
  regionId: varchar('region_id', { length: 100 }).notNull(),
  date: date('date').notNull(),
  value: real('value'),
  geographyLevel: varchar('geography_level', { length: 50 }).notNull(),
  homeType: varchar('home_type', { length: 50 }).notNull(),
  tier: varchar('tier', { length: 50 }),
  bedrooms: integer('bedrooms'),
  smoothed: boolean('smoothed').default(false),
  seasonallyAdjusted: boolean('seasonally_adjusted').default(false),
  frequency: varchar('frequency', { length: 20 }).default('monthly'),
}, (table) => [
  index('idx_zhvi_region_id').on(table.regionId),
  index('idx_zhvi_date').on(table.date),
  index('idx_zhvi_geography_level').on(table.geographyLevel),
  index('idx_zhvi_region_date').on(table.regionId, table.date),
]);

// Relations
export const regionsRelations = relations(regions, ({ many }) => ({
  zhviValues: many(zhviValues),
}));

// Type exports for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
export type ZhviValue = typeof zhviValues.$inferSelect;
export type NewZhviValue = typeof zhviValues.$inferInsert;
