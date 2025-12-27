{{
    config(
        materialized='view',
        schema='staging'
    )
}}

/*
    Staging model for ZORI (Zillow Observed Rent Index) values.

    Cleans and standardizes rental data from raw source.
*/

with source as (
    select * from {{ source('raw', 'zillow_zori_values') }}
),

cleaned as (
    select
        -- Surrogate key
        {{ dbt_utils.generate_surrogate_key(['region_id', 'date', 'home_type']) }} as zori_value_id,

        -- Foreign key
        region_id,

        -- Time dimension
        date as observation_date,
        date_trunc('month', date)::date as observation_month,
        extract(year from date)::int as observation_year,

        -- Value
        value as rent_value_usd,

        -- Dimensions
        geography_level,
        home_type,

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
