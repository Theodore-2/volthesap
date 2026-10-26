insert into public.vehicles (
  slug,
  make,
  model,
  variant,
  model_year,
  battery_capacity_kwh,
  battery_capacity_basis,
  wltp_range_km,
  consumption_kwh_100km,
  body_type,
  drivetrain,
  ac_charge_power_kw,
  dc_charge_power_kw,
  acceleration_0_100_s,
  top_speed_kmh,
  image_url,
  image_credit,
  image_license,
  image_source_url,
  source_name,
  source_url,
  specification_date,
  specification_notes,
  featured_rank,
  is_active
)
values
  (
    'kia-ev2-air-long-range-2026',
    'Kia', 'EV2', 'Air Long Range 61 kWh', 2026,
    61, 'manufacturer', 444, 15.2, 'SUV', 'front', 11, 118, null, 160,
    '/vehicles/generated/kia-ev2.webp',
    'Generated specifically for VoltHesap with OpenAI image generation',
    'VoltHesap project asset',
    null,
    'Kia UK official specifications',
    'https://www.kia.com/uk/new-cars/ev2/specification/',
    date '2026-10-26',
    'Official manufacturer figures for the 61 kWh front-wheel-drive Air configuration. Turkey-market equipment can differ; users can override the catalogue consumption in the calculator.',
    4,
    true
  ),
  (
    'kg-mobility-torres-evx-my26-2026',
    'KG Mobility', 'Torres EVX', 'MY26', 2026,
    80.6, 'manufacturer', 462, 18.65, 'SUV', 'front', 10.5, null, null, null,
    '/vehicles/generated/kgm-torres-evx.webp',
    'Generated specifically for VoltHesap with OpenAI image generation',
    'VoltHesap project asset',
    null,
    'KGM MY26 official technical specification',
    'https://kgm-rebuild-nextjs-postgres-assets-s3.s3.ap-southeast-2.amazonaws.com/specifications/KGM-MY26-Torres-EVX-Specs-and-Features.pdf',
    date '2026-10-26',
    'MY26 manufacturer figures. The source publishes charging times against charger ratings rather than a vehicle DC peak, so DC charge power is intentionally unset.',
    6,
    true
  ),
  (
    'mini-countryman-e-2026',
    'MINI', 'Countryman', 'Countryman E', 2026,
    65.2, 'usable', 501, 15.7, 'SUV', 'front', 11, 130, 8.6, 170,
    '/vehicles/generated/mini-countryman-electric.webp',
    'Generated specifically for VoltHesap with OpenAI image generation',
    'VoltHesap project asset',
    null,
    'MINI Türkiye technical brochure',
    'https://www.mini.com.tr/content/dam/MINI/marketTR/mini_com_tr/e-brosur/Tamamen_Elektrikli_MINI_Countryman.pdf.asset.1762270931299.pdf',
    date '2026-10-26',
    'The catalogue uses the most efficient published combined WLTP consumption and maximum range for the front-wheel-drive Countryman E. Equipment and wheel choice can reduce range.',
    7,
    true
  )
on conflict (slug) do update set
  make = excluded.make,
  model = excluded.model,
  variant = excluded.variant,
  model_year = excluded.model_year,
  battery_capacity_kwh = excluded.battery_capacity_kwh,
  battery_capacity_basis = excluded.battery_capacity_basis,
  wltp_range_km = excluded.wltp_range_km,
  consumption_kwh_100km = excluded.consumption_kwh_100km,
  body_type = excluded.body_type,
  drivetrain = excluded.drivetrain,
  ac_charge_power_kw = excluded.ac_charge_power_kw,
  dc_charge_power_kw = excluded.dc_charge_power_kw,
  acceleration_0_100_s = excluded.acceleration_0_100_s,
  top_speed_kmh = excluded.top_speed_kmh,
  image_url = excluded.image_url,
  image_credit = excluded.image_credit,
  image_license = excluded.image_license,
  image_source_url = excluded.image_source_url,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  specification_date = excluded.specification_date,
  specification_notes = excluded.specification_notes,
  featured_rank = excluded.featured_rank,
  is_active = excluded.is_active,
  updated_at = now();

update public.vehicles
set
  image_url = case
    when make = 'Togg' and model = 'T10X' then '/vehicles/generated/togg-t10x-white.webp'
    when make = 'Togg' and model = 'T10F' then '/vehicles/generated/togg-t10f-white.webp'
    when make = 'Tesla' and model = 'Model Y' then '/vehicles/generated/tesla-model-y.webp'
    when make = 'Tesla' and model = 'Model 3' then '/vehicles/generated/tesla-model-3.webp'
    when make = 'Volvo' and model = 'EX30' then '/vehicles/generated/volvo-ex30.webp'
    when make = 'BMW' and model = 'iX1' then '/vehicles/generated/bmw-ix1.webp'
    when make = 'Kia' and model = 'EV6' then '/vehicles/generated/kia-ev6.webp'
    when make = 'Škoda' and model = 'Enyaq' then '/vehicles/generated/skoda-enyaq.webp'
    else image_url
  end,
  updated_at = now()
where (make, model) in (
  ('Togg', 'T10X'),
  ('Togg', 'T10F'),
  ('Tesla', 'Model Y'),
  ('Tesla', 'Model 3'),
  ('Volvo', 'EX30'),
  ('BMW', 'iX1'),
  ('Kia', 'EV6'),
  ('Škoda', 'Enyaq')
);

update public.vehicles
set
  image_credit = 'Generated specifically for VoltHesap with OpenAI image generation',
  image_license = 'VoltHesap project asset',
  image_source_url = null,
  updated_at = now()
where (make, model) in (
  ('Tesla', 'Model Y'),
  ('Tesla', 'Model 3'),
  ('Volvo', 'EX30'),
  ('BMW', 'iX1'),
  ('Kia', 'EV6'),
  ('Škoda', 'Enyaq')
);

with remaining_catalogue as (
  select
    id,
    row_number() over (
      order by featured_rank nulls last, make, model, variant
    ) as catalogue_position
  from public.vehicles
  where is_active
    and (make, model) not in (
      ('Togg', 'T10X'),
      ('Togg', 'T10F'),
      ('Tesla', 'Model Y'),
      ('Kia', 'EV2'),
      ('Volvo', 'EX30'),
      ('KG Mobility', 'Torres EVX'),
      ('MINI', 'Countryman')
    )
)
update public.vehicles as vehicles
set featured_rank = 7 + remaining_catalogue.catalogue_position,
    updated_at = now()
from remaining_catalogue
where vehicles.id = remaining_catalogue.id;

update public.vehicles
set
  featured_rank = case
    when make = 'Togg' and model = 'T10X' then 1
    when make = 'Togg' and model = 'T10F' then 2
    when make = 'Tesla' and model = 'Model Y' then 3
    when make = 'Kia' and model = 'EV2' then 4
    when make = 'Volvo' and model = 'EX30' then 5
    when make = 'KG Mobility' and model = 'Torres EVX' then 6
    when make = 'MINI' and model = 'Countryman' then 7
    else featured_rank
  end,
  updated_at = now()
where (make, model) in (
  ('Togg', 'T10X'),
  ('Togg', 'T10F'),
  ('Tesla', 'Model Y'),
  ('Kia', 'EV2'),
  ('Volvo', 'EX30'),
  ('KG Mobility', 'Torres EVX'),
  ('MINI', 'Countryman')
);
