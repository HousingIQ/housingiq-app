{{
    config(
        materialized='incremental',
        schema='analytics',
        unique_key='zori_value_id',
        incremental_strategy='merge',
        contract={'enforced': true}
    )
}}

/*
    Fact table for ZORI (Zillow Observed Rent Index) values.

    Contains monthly rental value observations with derived metrics
    for year-over-year and month-over-month changes.
*/

with zori_values as (
    select * from {{ ref('stg_zillow__zori_values') }}
    {% if is_incremental() %}
    where observation_date > (select max(observation_date) from {{ this }})
    {% endif %}
),

with_changes as (
    select
        v.*,

        -- Previous period values (using window functions)
        lag(rent_value_usd, 1) over (
            partition by region_id, home_type
            order by observation_date
        ) as prev_month_value,

        lag(rent_value_usd, 12) over (
            partition by region_id, home_type
            order by observation_date
        ) as prev_year_value

    from zori_values v
),

final as (
    select
        -- Surrogate key
        zori_value_id,

        -- Foreign keys
        region_id,
        observation_month as date_key,

        -- Time attributes
        observation_date,
        observation_month,
        observation_year,

        -- Measures
        rent_value_usd,

        -- Derived measures: Month-over-month change
        prev_month_value,
        rent_value_usd - coalesce(prev_month_value, rent_value_usd) as mom_change_usd,
        case
            when prev_month_value is not null and prev_month_value > 0
            then round(((rent_value_usd - prev_month_value) / prev_month_value * 100)::numeric, 2)
            else null
        end as mom_change_pct,

        -- Derived measures: Year-over-year change
        prev_year_value,
        rent_value_usd - coalesce(prev_year_value, rent_value_usd) as yoy_change_usd,
        case
            when prev_year_value is not null and prev_year_value > 0
            then round(((rent_value_usd - prev_year_value) / prev_year_value * 100)::numeric, 2)
            else null
        end as yoy_change_pct,

        -- Dimensions
        home_type,
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
