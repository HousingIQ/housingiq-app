-- HousingIQ Database Schema Initialization
-- This script runs automatically when PostgreSQL container starts

-- Create schemas for different concerns
CREATE SCHEMA IF NOT EXISTS raw;        -- Landing zone for ingested data (Python/Dagster)
CREATE SCHEMA IF NOT EXISTS staging;    -- dbt staging models
CREATE SCHEMA IF NOT EXISTS analytics;  -- dbt mart tables (dim_*, fct_*)
CREATE SCHEMA IF NOT EXISTS app;        -- Webapp tables (users, sessions)

-- Grant permissions to housingiq user
GRANT ALL ON SCHEMA raw TO housingiq;
GRANT ALL ON SCHEMA staging TO housingiq;
GRANT ALL ON SCHEMA analytics TO housingiq;
GRANT ALL ON SCHEMA app TO housingiq;

-- Set default search path
ALTER USER housingiq SET search_path TO public, raw, staging, analytics, app;

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'HousingIQ schemas created successfully: raw, staging, analytics, app';
END $$;
