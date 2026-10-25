-- Initial VoltHesap schema.
-- All user-owned tables are protected by Row Level Security.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferred_currency text not null default 'TRY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 80
  ),
  constraint profiles_preferred_currency_format check (
    preferred_currency ~ '^[A-Z]{3}$'
  )
);

create table public.vehicles (
  id bigint generated always as identity primary key,
  slug text not null unique,
  make text not null,
  model text not null,
  variant text,
  model_year smallint,
  usable_battery_kwh numeric(7, 2),
  wltp_range_km numeric(7, 1),
  consumption_kwh_100km numeric(6, 2) not null,
  body_type text,
  drivetrain text,
  ac_charge_power_kw numeric(7, 2),
  dc_charge_power_kw numeric(7, 2),
  acceleration_0_100_s numeric(5, 2),
  top_speed_kmh smallint,
  image_url text,
  image_credit text,
  image_license text,
  image_source_url text,
  source_name text,
  source_url text,
  specification_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint vehicles_make_length check (char_length(make) between 1 and 80),
  constraint vehicles_model_length check (char_length(model) between 1 and 120),
  constraint vehicles_variant_length check (
    variant is null or char_length(variant) between 1 and 120
  ),
  constraint vehicles_model_year_range check (
    model_year is null or model_year between 1990 and 2100
  ),
  constraint vehicles_usable_battery_positive check (
    usable_battery_kwh is null or usable_battery_kwh > 0
  ),
  constraint vehicles_wltp_range_positive check (
    wltp_range_km is null or wltp_range_km > 0
  ),
  constraint vehicles_consumption_positive check (consumption_kwh_100km > 0),
  constraint vehicles_drivetrain_allowed check (
    drivetrain is null or drivetrain in ('front', 'rear', 'all')
  ),
  constraint vehicles_ac_charge_power_positive check (
    ac_charge_power_kw is null or ac_charge_power_kw > 0
  ),
  constraint vehicles_dc_charge_power_positive check (
    dc_charge_power_kw is null or dc_charge_power_kw > 0
  ),
  constraint vehicles_acceleration_positive check (
    acceleration_0_100_s is null or acceleration_0_100_s > 0
  ),
  constraint vehicles_top_speed_positive check (
    top_speed_kmh is null or top_speed_kmh > 0
  ),
  constraint vehicles_image_url_https check (
    image_url is null or image_url ~ '^https://'
  ),
  constraint vehicles_image_source_url_https check (
    image_source_url is null or image_source_url ~ '^https://'
  ),
  constraint vehicles_source_url_https check (
    source_url is null or source_url ~ '^https://'
  ),
  constraint vehicles_identity_unique unique nulls not distinct (
    make,
    model,
    variant,
    model_year
  )
);

create table public.regulatory_sources (
  id bigint generated always as identity primary key,
  jurisdiction text not null default 'TR',
  authority text not null,
  title text not null,
  document_number text,
  publication_date date,
  effective_from date,
  effective_to date,
  source_url text not null unique,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint regulatory_sources_jurisdiction_length check (
    char_length(jurisdiction) between 2 and 12
  ),
  constraint regulatory_sources_authority_length check (
    char_length(authority) between 1 and 160
  ),
  constraint regulatory_sources_title_length check (
    char_length(title) between 1 and 300
  ),
  constraint regulatory_sources_effective_period check (
    effective_from is null
    or effective_to is null
    or effective_to >= effective_from
  ),
  constraint regulatory_sources_url_https check (source_url ~ '^https://')
);

create table public.electricity_tariffs (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.regulatory_sources (id) on delete restrict,
  country_code text not null default 'TR',
  region_name text,
  provider_name text,
  customer_group text not null,
  plan_name text not null,
  currency text not null default 'TRY',
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint electricity_tariffs_country_code_format check (
    country_code ~ '^[A-Z]{2}$'
  ),
  constraint electricity_tariffs_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint electricity_tariffs_effective_period check (
    effective_to is null or effective_to >= effective_from
  ),
  constraint electricity_tariffs_identity_unique unique nulls not distinct (
    source_id,
    region_name,
    provider_name,
    customer_group,
    plan_name,
    effective_from
  )
);

create table public.electricity_tariff_components (
  id bigint generated always as identity primary key,
  tariff_id bigint not null references public.electricity_tariffs (id) on delete cascade,
  component_type text not null,
  label text not null,
  calculation_method text not null,
  rate numeric(14, 6) not null,
  tier_start_kwh numeric(12, 3),
  tier_end_kwh numeric(12, 3),
  applies_to text,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint electricity_tariff_components_type_allowed check (
    component_type in ('energy', 'distribution', 'tax', 'fund', 'fixed_fee', 'other')
  ),
  constraint electricity_tariff_components_method_allowed check (
    calculation_method in ('per_kwh', 'percentage', 'fixed')
  ),
  constraint electricity_tariff_components_rate_nonnegative check (rate >= 0),
  constraint electricity_tariff_components_tier_start_nonnegative check (
    tier_start_kwh is null or tier_start_kwh >= 0
  ),
  constraint electricity_tariff_components_tier_order check (
    tier_start_kwh is null
    or tier_end_kwh is null
    or tier_end_kwh > tier_start_kwh
  )
);

create table public.user_vehicles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id bigint not null references public.vehicles (id) on delete restrict,
  nickname text,
  custom_consumption_kwh_100km numeric(6, 2),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_vehicles_nickname_length check (
    nickname is null or char_length(nickname) between 1 and 80
  ),
  constraint user_vehicles_custom_consumption_positive check (
    custom_consumption_kwh_100km is null or custom_consumption_kwh_100km > 0
  ),
  constraint user_vehicles_user_vehicle_unique unique (user_id, vehicle_id)
);

create table public.calculations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  user_vehicle_id bigint references public.user_vehicles (id) on delete set null,
  distance_km numeric(10, 2) not null,
  ev_consumption_kwh_100km numeric(7, 3) not null,
  electricity_unit_price numeric(12, 4) not null,
  public_electricity_unit_price numeric(12, 4),
  charging_loss_percent numeric(5, 2) not null default 0,
  charging_setup text,
  charge_input_mode text,
  charges_per_month numeric(7, 2),
  start_charge_percent numeric(5, 2),
  end_charge_percent numeric(5, 2),
  battery_energy_per_charge_kwh numeric(10, 3),
  home_charging_percent numeric(5, 2),
  monthly_electricity_bill numeric(14, 2),
  monthly_water_bill numeric(14, 2),
  monthly_heating_bill numeric(14, 2),
  tax_and_fund_percent numeric(7, 4),
  comparison_fuel_type text,
  fuel_consumption_l_100km numeric(7, 3),
  fuel_unit_price numeric(12, 4),
  grid_energy_kwh numeric(12, 3) not null,
  ev_cost numeric(14, 2) not null,
  fuel_cost numeric(14, 2),
  savings_amount numeric(14, 2),
  savings_percent numeric(8, 2),
  monthly_charging_cost numeric(14, 2),
  monthly_home_charging_cost numeric(14, 2),
  electricity_bill_share_percent numeric(8, 2),
  electricity_bill_before_ev numeric(14, 2),
  annual_ev_cost numeric(14, 2),
  annual_fuel_cost numeric(14, 2),
  annual_savings_amount numeric(14, 2),
  currency text not null default 'TRY',
  input_source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint calculations_distance_positive check (distance_km > 0),
  constraint calculations_ev_consumption_positive check (ev_consumption_kwh_100km > 0),
  constraint calculations_electricity_price_nonnegative check (electricity_unit_price >= 0),
  constraint calculations_public_electricity_price_nonnegative check (
    public_electricity_unit_price is null or public_electricity_unit_price >= 0
  ),
  constraint calculations_charging_loss_range check (
    charging_loss_percent between 0 and 50
  ),
  constraint calculations_charging_setup_allowed check (
    charging_setup is null or charging_setup in ('outlet', 'wallbox', 'public-ac', 'public-dc')
  ),
  constraint calculations_charge_input_mode_allowed check (
    charge_input_mode is null or charge_input_mode in ('percentage', 'energy')
  ),
  constraint calculations_charges_per_month_nonnegative check (
    charges_per_month is null or charges_per_month >= 0
  ),
  constraint calculations_start_charge_range check (
    start_charge_percent is null or start_charge_percent between 0 and 100
  ),
  constraint calculations_end_charge_range check (
    end_charge_percent is null or end_charge_percent between 0 and 100
  ),
  constraint calculations_charge_percent_order check (
    start_charge_percent is null
    or end_charge_percent is null
    or end_charge_percent >= start_charge_percent
  ),
  constraint calculations_battery_energy_per_charge_nonnegative check (
    battery_energy_per_charge_kwh is null or battery_energy_per_charge_kwh >= 0
  ),
  constraint calculations_home_charging_range check (
    home_charging_percent is null or home_charging_percent between 0 and 100
  ),
  constraint calculations_monthly_bills_nonnegative check (
    (monthly_electricity_bill is null or monthly_electricity_bill >= 0)
    and (monthly_water_bill is null or monthly_water_bill >= 0)
    and (monthly_heating_bill is null or monthly_heating_bill >= 0)
  ),
  constraint calculations_tax_and_fund_nonnegative check (
    tax_and_fund_percent is null or tax_and_fund_percent >= 0
  ),
  constraint calculations_comparison_fuel_type_allowed check (
    comparison_fuel_type is null or comparison_fuel_type in ('gasoline', 'diesel')
  ),
  constraint calculations_fuel_consumption_positive check (
    fuel_consumption_l_100km is null or fuel_consumption_l_100km > 0
  ),
  constraint calculations_fuel_price_nonnegative check (
    fuel_unit_price is null or fuel_unit_price >= 0
  ),
  constraint calculations_grid_energy_nonnegative check (grid_energy_kwh >= 0),
  constraint calculations_ev_cost_nonnegative check (ev_cost >= 0),
  constraint calculations_fuel_cost_nonnegative check (fuel_cost is null or fuel_cost >= 0),
  constraint calculations_report_values_nonnegative check (
    (monthly_charging_cost is null or monthly_charging_cost >= 0)
    and (monthly_home_charging_cost is null or monthly_home_charging_cost >= 0)
    and (electricity_bill_share_percent is null or electricity_bill_share_percent >= 0)
    and (electricity_bill_before_ev is null or electricity_bill_before_ev >= 0)
    and (annual_ev_cost is null or annual_ev_cost >= 0)
    and (annual_fuel_cost is null or annual_fuel_cost >= 0)
  ),
  constraint calculations_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint calculations_input_source_allowed check (
    input_source in ('manual', 'vehicle', 'invoice')
  )
);

create table public.invoice_analyses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_label text,
  provider_name text,
  invoice_date date,
  due_date date,
  billing_period_start date,
  billing_period_end date,
  consumption_kwh numeric(12, 3) not null,
  total_amount numeric(14, 2) not null,
  unit_price numeric(12, 4) not null,
  currency text not null default 'TRY',
  parser_version text,
  extraction_confidence numeric(5, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_analyses_document_label_length check (
    document_label is null or char_length(document_label) between 1 and 160
  ),
  constraint invoice_analyses_period_order check (
    billing_period_start is null
    or billing_period_end is null
    or billing_period_end >= billing_period_start
  ),
  constraint invoice_analyses_due_date_order check (
    invoice_date is null or due_date is null or due_date >= invoice_date
  ),
  constraint invoice_analyses_consumption_positive check (consumption_kwh > 0),
  constraint invoice_analyses_total_nonnegative check (total_amount >= 0),
  constraint invoice_analyses_unit_price_nonnegative check (unit_price >= 0),
  constraint invoice_analyses_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint invoice_analyses_confidence_range check (
    extraction_confidence is null or extraction_confidence between 0 and 1
  )
);

create table public.invoice_line_items (
  id bigint generated always as identity primary key,
  invoice_analysis_id bigint not null references public.invoice_analyses (id) on delete cascade,
  category text not null,
  label text not null,
  quantity numeric(14, 4),
  unit text,
  unit_price numeric(14, 6),
  tax_rate_percent numeric(7, 4),
  amount numeric(14, 2) not null,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint invoice_line_items_category_allowed check (
    category in ('energy', 'distribution', 'tax', 'fund', 'fixed_fee', 'discount', 'other')
  ),
  constraint invoice_line_items_quantity_nonnegative check (
    quantity is null or quantity >= 0
  ),
  constraint invoice_line_items_unit_price_nonnegative check (
    unit_price is null or unit_price >= 0
  ),
  constraint invoice_line_items_tax_rate_nonnegative check (
    tax_rate_percent is null or tax_rate_percent >= 0
  )
);

create index user_vehicles_user_id_idx on public.user_vehicles (user_id);
create unique index user_vehicles_one_default_per_user_idx
  on public.user_vehicles (user_id)
  where is_default;
create index calculations_user_created_at_idx
  on public.calculations (user_id, created_at desc);
create index calculations_user_vehicle_id_idx
  on public.calculations (user_vehicle_id)
  where user_vehicle_id is not null;
create index invoice_analyses_user_created_at_idx
  on public.invoice_analyses (user_id, created_at desc);
create index vehicles_active_make_model_idx
  on public.vehicles (is_active, make, model);
create index electricity_tariffs_source_id_idx
  on public.electricity_tariffs (source_id);
create index electricity_tariffs_active_period_idx
  on public.electricity_tariffs (country_code, is_active, effective_from desc);
create index electricity_tariff_components_tariff_id_idx
  on public.electricity_tariff_components (tariff_id, display_order);
create index invoice_line_items_invoice_analysis_id_idx
  on public.invoice_line_items (invoice_analysis_id, display_order);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

create trigger electricity_tariffs_set_updated_at
before update on public.electricity_tariffs
for each row execute function public.set_updated_at();

create trigger user_vehicles_set_updated_at
before update on public.user_vehicles
for each row execute function public.set_updated_at();

create trigger invoice_analyses_set_updated_at
before update on public.invoice_analyses
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.vehicles enable row level security;
alter table public.vehicles force row level security;
alter table public.user_vehicles enable row level security;
alter table public.user_vehicles force row level security;
alter table public.calculations enable row level security;
alter table public.calculations force row level security;
alter table public.invoice_analyses enable row level security;
alter table public.invoice_analyses force row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_line_items force row level security;
alter table public.regulatory_sources enable row level security;
alter table public.regulatory_sources force row level security;
alter table public.electricity_tariffs enable row level security;
alter table public.electricity_tariffs force row level security;
alter table public.electricity_tariff_components enable row level security;
alter table public.electricity_tariff_components force row level security;

create policy "Active vehicles are publicly readable"
on public.vehicles
for select
to anon, authenticated
using (is_active);

create policy "Regulatory sources are publicly readable"
on public.regulatory_sources
for select
to anon, authenticated
using (true);

create policy "Active electricity tariffs are publicly readable"
on public.electricity_tariffs
for select
to anon, authenticated
using (is_active);

create policy "Active electricity tariff components are publicly readable"
on public.electricity_tariff_components
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.electricity_tariffs
    where public.electricity_tariffs.id = tariff_id
      and public.electricity_tariffs.is_active
  )
);

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read their own vehicles"
on public.user_vehicles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own vehicles"
on public.user_vehicles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own vehicles"
on public.user_vehicles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own vehicles"
on public.user_vehicles
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own calculations"
on public.calculations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own calculations"
on public.calculations
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    user_vehicle_id is null
    or exists (
      select 1
      from public.user_vehicles
      where public.user_vehicles.id = user_vehicle_id
        and public.user_vehicles.user_id = (select auth.uid())
    )
  )
);

create policy "Users can delete their own calculations"
on public.calculations
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own invoice analyses"
on public.invoice_analyses
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own invoice analyses"
on public.invoice_analyses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own invoice analyses"
on public.invoice_analyses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own invoice analyses"
on public.invoice_analyses
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own invoice line items"
on public.invoice_line_items
for select
to authenticated
using (
  exists (
    select 1
    from public.invoice_analyses
    where public.invoice_analyses.id = invoice_analysis_id
      and public.invoice_analyses.user_id = (select auth.uid())
  )
);

create policy "Users can create their own invoice line items"
on public.invoice_line_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.invoice_analyses
    where public.invoice_analyses.id = invoice_analysis_id
      and public.invoice_analyses.user_id = (select auth.uid())
  )
);

create policy "Users can update their own invoice line items"
on public.invoice_line_items
for update
to authenticated
using (
  exists (
    select 1
    from public.invoice_analyses
    where public.invoice_analyses.id = invoice_analysis_id
      and public.invoice_analyses.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.invoice_analyses
    where public.invoice_analyses.id = invoice_analysis_id
      and public.invoice_analyses.user_id = (select auth.uid())
  )
);

create policy "Users can delete their own invoice line items"
on public.invoice_line_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.invoice_analyses
    where public.invoice_analyses.id = invoice_analysis_id
      and public.invoice_analyses.user_id = (select auth.uid())
  )
);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.vehicles from anon, authenticated;
revoke all on table public.user_vehicles from anon, authenticated;
revoke all on table public.calculations from anon, authenticated;
revoke all on table public.invoice_analyses from anon, authenticated;
revoke all on table public.invoice_line_items from anon, authenticated;
revoke all on table public.regulatory_sources from anon, authenticated;
revoke all on table public.electricity_tariffs from anon, authenticated;
revoke all on table public.electricity_tariff_components from anon, authenticated;

grant select on table public.vehicles to anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_vehicles to authenticated;
grant select, insert, delete on table public.calculations to authenticated;
grant select, insert, update, delete on table public.invoice_analyses to authenticated;
grant select, insert, update, delete on table public.invoice_line_items to authenticated;
grant select on table public.regulatory_sources to anon, authenticated;
grant select on table public.electricity_tariffs to anon, authenticated;
grant select on table public.electricity_tariff_components to anon, authenticated;

grant usage, select on sequence public.user_vehicles_id_seq to authenticated;
grant usage, select on sequence public.calculations_id_seq to authenticated;
grant usage, select on sequence public.invoice_analyses_id_seq to authenticated;
grant usage, select on sequence public.invoice_line_items_id_seq to authenticated;
