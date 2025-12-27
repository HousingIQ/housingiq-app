{{
    config(
        materialized='incremental',
        schema='app',
        alias='zhvi_values',
        unique_key=['region_id', 'date', 'home_type', 'tier', 'bedrooms'],
        incremental_strategy='merge'
    )
}}

/*
    App layer: ZHVI values table for the webapp.

    This model outputs data in the exact format expected by the
    webapp's Drizzle schema (housingiq-app/webapp/src/lib/db/schema.ts).
*/

with source as (
    select * from {{ ref('fct_zhvi_values') }}
    {% if is_incremental() %}
    where observation_date > (select max(date) from {{ this }})
    {% endif %}
),

final as (
    select
        -- Primary key (auto-generated in webapp)
        row_number() over (order by region_id, observation_date) as id,

        -- Core fields (matching webapp schema exactly)
        region_id,
        observation_date as date,
        cast(home_value_usd as real) as value,
        geography_level,
        home_type,
        price_tier as tier,
        cast(bedroom_count as integer) as bedrooms,
        is_smoothed as smoothed,
        is_seasonally_adjusted as seasonally_adjusted,
        frequency

    from source
)

select * from final
