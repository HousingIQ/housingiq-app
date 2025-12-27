{{
    config(
        materialized='table',
        schema='analytics'
    )
}}

/*
    Regional summary aggregate table.

    Pre-computed aggregates for common dashboard queries,
    providing current values and trends by region.
*/

with latest_zhvi as (
    select
        region_id,
        home_value_usd,
        yoy_change_pct as zhvi_yoy_pct,
        mom_change_pct as zhvi_mom_pct,
        observation_date,
        row_number() over (
            partition by region_id
            order by observation_date desc
        ) as rn
    from {{ ref('fct_zhvi_values') }}
    where home_type = 'All Homes'
      and price_tier = 'Mid-Tier'
      and bedroom_count is null
      and is_smoothed = true
      and is_seasonally_adjusted = true
),

latest_zori as (
    select
        region_id,
        rent_value_usd,
        yoy_change_pct as zori_yoy_pct,
        mom_change_pct as zori_mom_pct,
        observation_date,
        row_number() over (
            partition by region_id
            order by observation_date desc
        ) as rn
    from {{ ref('fct_zori_values') }}
    where home_type = 'All Homes Plus Multifamily'
      and is_smoothed = true
      and is_seasonally_adjusted = true
),

regions as (
    select * from {{ ref('dim_regions') }}
    where is_current = true
),

final as (
    select
        r.region_id,
        r.region_name,
        r.display_name,
        r.geography_level,
        r.geography_level_rank,
        r.state_code,
        r.state_name,
        r.metro,

        -- ZHVI (Home Values)
        z.home_value_usd as current_home_value,
        z.zhvi_yoy_pct as home_value_yoy_pct,
        z.zhvi_mom_pct as home_value_mom_pct,
        z.observation_date as home_value_date,

        -- ZORI (Rents)
        o.rent_value_usd as current_rent_value,
        o.zori_yoy_pct as rent_yoy_pct,
        o.zori_mom_pct as rent_mom_pct,
        o.observation_date as rent_value_date,

        -- Derived: Price-to-Rent Ratio
        case
            when o.rent_value_usd is not null and o.rent_value_usd > 0
            then round((z.home_value_usd / (o.rent_value_usd * 12))::numeric, 2)
            else null
        end as price_to_rent_ratio,

        -- Derived: Annual Rent Yield
        case
            when z.home_value_usd is not null and z.home_value_usd > 0
            then round(((o.rent_value_usd * 12) / z.home_value_usd * 100)::numeric, 2)
            else null
        end as gross_rent_yield_pct,

        -- Metadata
        current_timestamp as _loaded_at

    from regions r
    left join latest_zhvi z on r.region_id = z.region_id and z.rn = 1
    left join latest_zori o on r.region_id = o.region_id and o.rn = 1
)

select * from final
