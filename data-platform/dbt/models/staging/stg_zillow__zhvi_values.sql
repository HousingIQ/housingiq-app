{{
    config(
        materialized='view',
        schema='staging'
    )
}}

/*
    Staging model for ZHVI (Zillow Home Value Index) values.

    Cleans and standardizes home value data from raw source.
*/

with source as (
    select * from {{ source('raw', 'zillow_zhvi_values') }}
),

cleaned as (
    select
        -- Surrogate key
        {{ dbt_utils.generate_surrogate_key(['region_id', 'date', 'home_type', 'tier', 'bedrooms']) }} as zhvi_value_id,

        -- Foreign key
        region_id,

        -- Time dimension
        date as observation_date,
        date_trunc('month', date)::date as observation_month,
        extract(year from date)::int as observation_year,

        -- Value
        value as home_value_usd,

        -- Dimensions
        geography_level,
        home_type,
        tier as price_tier,
        bedrooms as bedroom_count,

        -- Flags
        smoothed as is_smoothed,
        seasonally_adjusted as is_seasonally_adjusted,
        frequency,

        -- Metadata
        current_timestamp as _loaded_at

    from source
    where
        region_id is not null
        and date is not null
        and value is not null
        and value > 0
)

select * from cleaned
