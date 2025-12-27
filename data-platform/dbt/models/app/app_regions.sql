{{
    config(
        materialized='table',
        schema='app',
        alias='regions'
    )
}}

/*
    App layer: Regions table for the webapp.

    This model outputs data in the exact format expected by the
    webapp's Drizzle schema (housingiq-app/webapp/src/lib/db/schema.ts).
*/

with source as (
    select * from {{ ref('dim_regions') }}
    where is_current = true
),

final as (
    select
        -- Primary key (auto-generated in webapp)
        row_number() over (order by region_id) as id,

        -- Core identifiers (matching webapp schema)
        region_id,
        cast(region_id_original as integer) as region_id_original,
        region_name,

        -- Location fields
        state_code as state,
        state_name,
        city,
        county_name as county,
        metro,

        -- Classification
        geography_level,
        null::varchar(50) as region_type,  -- Not in current data
        size_rank,

        -- FIPS codes (not in current data)
        null::integer as state_code_fips,
        null::integer as municipal_code_fips

    from source
)

select * from final
