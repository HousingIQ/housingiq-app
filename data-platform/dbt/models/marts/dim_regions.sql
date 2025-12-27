{{
    config(
        materialized='table',
        schema='analytics',
        contract={'enforced': true}
    )
}}

/*
    Dimension table for geographic regions.

    This is the primary dimension for all housing metrics,
    providing standardized region information with SCD Type 2 support.
*/

with regions as (
    select * from {{ ref('stg_zillow__regions') }}
),

final as (
    select
        -- Primary key
        region_id,

        -- Region identifiers
        region_id_original,
        region_name,

        -- Geography hierarchy
        geography_level,
        state_code,
        state_name,
        city,
        county_name,
        metro,

        -- Derived fields
        case geography_level
            when 'National' then 1
            when 'State' then 2
            when 'Metro' then 3
            when 'County' then 4
            when 'City' then 5
            when 'Zip' then 6
            when 'Neighborhood' then 7
            else 99
        end as geography_level_rank,

        -- Full location string for display
        case
            when geography_level = 'National' then 'United States'
            when geography_level = 'State' then state_name
            when geography_level = 'Metro' then metro || ' Metro Area'
            when geography_level = 'County' then county_name || ', ' || state_code
            when geography_level = 'City' then city || ', ' || state_code
            when geography_level = 'Zip' then region_name || ' - ' || city || ', ' || state_code
            when geography_level = 'Neighborhood' then region_name || ' - ' || city || ', ' || state_code
            else region_name
        end as display_name,

        -- Ranking
        size_rank,

        -- SCD Type 2 fields
        current_timestamp as valid_from,
        null::timestamp as valid_to,
        true as is_current,

        -- Metadata
        _loaded_at

    from regions
)

select * from final
