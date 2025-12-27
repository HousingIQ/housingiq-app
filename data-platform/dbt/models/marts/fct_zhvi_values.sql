{{
    config(
        materialized='incremental',
        schema='analytics',
        unique_key='zhvi_value_id',
        incremental_strategy='merge',
        contract={'enforced': true}
    )
}}

/*
    Fact table for ZHVI (Zillow Home Value Index) values.

    Contains monthly home value observations with derived metrics
    for year-over-year and month-over-month changes.
*/

with zhvi_values as (
    select * from {{ ref('stg_zillow__zhvi_values') }}
    {% if is_incremental() %}
    where observation_date > (select max(observation_date) from {{ this }})
    {% endif %}
),

with_changes as (
    select
        v.*,

        -- Previous period values (using window functions)
        lag(home_value_usd, 1) over (
            partition by region_id, home_type, price_tier, bedroom_count
            order by observation_date
        ) as prev_month_value,

        lag(home_value_usd, 12) over (
            partition by region_id, home_type, price_tier, bedroom_count
            order by observation_date
        ) as prev_year_value

    from zhvi_values v
),

final as (
    select
        -- Surrogate key
        zhvi_value_id,

        -- Foreign keys
        region_id,
        observation_month as date_key,

        -- Time attributes
        observation_date,
        observation_month,
        observation_year,

        -- Measures
        home_value_usd,

        -- Derived measures: Month-over-month change
        prev_month_value,
        home_value_usd - coalesce(prev_month_value, home_value_usd) as mom_change_usd,
        case
            when prev_month_value is not null and prev_month_value > 0
            then round(((home_value_usd - prev_month_value) / prev_month_value * 100)::numeric, 2)
            else null
        end as mom_change_pct,

        -- Derived measures: Year-over-year change
        prev_year_value,
        home_value_usd - coalesce(prev_year_value, home_value_usd) as yoy_change_usd,
        case
            when prev_year_value is not null and prev_year_value > 0
            then round(((home_value_usd - prev_year_value) / prev_year_value * 100)::numeric, 2)
            else null
        end as yoy_change_pct,

        -- Dimensions
        home_type,
        price_tier,
        bedroom_count,
        geography_level,

        -- Flags
        is_smoothed,
        is_seasonally_adjusted,
        frequency,

        -- Metadata
        _loaded_at

    from with_changes
)

select * from final
