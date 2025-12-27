{{
    config(
        materialized='view',
        schema='staging'
    )
}}

/*
    Staging model for Zillow geographic regions.

    Cleans and standardizes region data from raw source.
*/

with source as (
    select * from {{ source('raw', 'zillow_regions') }}
),

cleaned as (
    select
        -- Primary key
        region_id,

        -- Region identifiers
        region_id_original,
        region_name,

        -- Geography
        geography_level,
        coalesce(state_code, '') as state_code,
        coalesce(state_name, '') as state_name,
        coalesce(city, '') as city,
        coalesce(county_name, '') as county_name,
        coalesce(metro, '') as metro,

        -- Ranking
        size_rank,

        -- Metadata
        current_timestamp as _loaded_at

    from source
    where region_id is not null
)

select * from cleaned
