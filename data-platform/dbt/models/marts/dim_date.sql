{{
    config(
        materialized='table',
        schema='analytics'
    )
}}

/*
    Date dimension table.

    Standard date dimension with various date attributes
    for time-series analysis of housing data.
*/

with date_spine as (
    {{ dbt_utils.date_spine(
        datepart="month",
        start_date="cast('2000-01-01' as date)",
        end_date="cast('2030-12-01' as date)"
    ) }}
),

final as (
    select
        -- Primary key
        date_month as date_key,

        -- Date components
        extract(year from date_month)::int as year,
        extract(month from date_month)::int as month,
        extract(quarter from date_month)::int as quarter,

        -- Date labels
        to_char(date_month, 'YYYY-MM') as year_month,
        to_char(date_month, 'Mon YYYY') as month_name_year,
        to_char(date_month, 'Month') as month_name,
        to_char(date_month, 'Q') || 'Q' || to_char(date_month, 'YYYY') as quarter_year,

        -- Fiscal year (assuming calendar year = fiscal year)
        extract(year from date_month)::int as fiscal_year,
        extract(quarter from date_month)::int as fiscal_quarter,

        -- Relative date flags
        case when date_month = date_trunc('month', current_date)::date
             then true else false end as is_current_month,
        case when extract(year from date_month) = extract(year from current_date)
             then true else false end as is_current_year,

        -- Previous period references
        (date_month - interval '1 month')::date as previous_month,
        (date_month - interval '1 year')::date as same_month_previous_year,

        -- Metadata
        current_timestamp as _loaded_at

    from date_spine
)

select * from final
