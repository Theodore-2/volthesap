alter table public.vehicles
  rename column usable_battery_kwh to battery_capacity_kwh;

alter table public.vehicles
  rename constraint vehicles_usable_battery_positive to vehicles_battery_capacity_positive;

alter table public.vehicles
  add column battery_capacity_basis text,
  add column specification_notes text,
  add column featured_rank smallint,
  add constraint vehicles_battery_capacity_basis_allowed check (
    battery_capacity_basis is null
    or battery_capacity_basis in ('gross', 'usable', 'manufacturer')
  ),
  add constraint vehicles_featured_rank_positive check (
    featured_rank is null or featured_rank > 0
  );

alter table public.vehicles
  drop constraint vehicles_image_url_https;

alter table public.vehicles
  add constraint vehicles_image_url_allowed check (
    image_url is null
    or image_url ~ '^https://'
    or image_url ~ '^/'
  );

create index vehicles_featured_catalog_idx
  on public.vehicles (featured_rank, make, model)
  where is_active and featured_rank is not null;

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
  featured_rank
)
values
  (
    'togg-t10x-v2-rwd-long-range-2025',
    'Togg', 'T10X', 'V2 RWD Long Range', 2025,
    88.5, 'gross', 523, 19.1, 'SUV', 'rear', 22, 180, 7.8, 185,
    '/vehicles/togg-t10x.jpg', 'Alexander-93', 'CC BY-SA 4.0',
    'https://commons.wikimedia.org/wiki/File:Togg_T10X_IAA_2025_DSC_1648.jpg',
    'Togg T10X catalogue',
    'https://trumore-cdn.togg.cloud/EU/TOGG_T10X_0825_CTG_TR.pdf',
    date '2026-10-26',
    'Battery capacity is the manufacturer-published gross value. Consumption and range are combined WLTP values.',
    1
  ),
  (
    'togg-t10f-v1-rwd-long-range-2026',
    'Togg', 'T10F', 'V1 RWD Long Range, 19-inch', 2026,
    88.5, 'gross', 623, 17.1, 'Fastback', 'rear', 11, 180, 7.5, 177,
    '/vehicles/togg-t10f.jpg', 'Alexander-93', 'CC BY-SA 4.0',
    'https://commons.wikimedia.org/wiki/File:Togg_T10F_IAA_2025_DSC_2233.jpg',
    'Togg T10F catalogue',
    'https://trumore-cdn.togg.cloud/EU/TOGG_T10F_0825_CTG_TR.pdf',
    date '2026-10-26',
    'Battery capacity is the manufacturer-published gross value. Range and consumption refer to the 19-inch-wheel configuration.',
    2
  ),
  (
    'tesla-model-y-premium-long-range-rwd-2026',
    'Tesla', 'Model Y', 'Premium Long Range RWD', 2026,
    null, null, 609, 14.0, 'SUV', 'rear', 11, 250, 5.6, null,
    '/vehicles/tesla-model-y.jpg', 'Alexander Migl', 'CC BY-SA 4.0',
    'https://commons.wikimedia.org/wiki/File:Tesla_Model_Y_(2025)_MYLE_Festival_2025_DSC_9565.jpg',
    'Tesla Türkiye',
    'https://www.tesla.com/tr_tr/learn/introducing-new-model-y',
    date '2026-10-26',
    'Tesla does not publish battery capacity for this configuration. Energy consumption is from Tesla Turkey power-consumption data; charging power is the supported V3 peak and can vary by vehicle and conditions.',
    3
  ),
  (
    'hyundai-ioniq-5-84-kwh-rwd-2026',
    'Hyundai', 'IONIQ 5', '84 kWh RWD', 2026,
    84, 'manufacturer', 570, 16.0, 'Crossover', 'rear', 11, 350, 7.5, 185,
    '/vehicles/hyundai-ioniq-5.jpg', 'Alexander-93', 'CC BY-SA 4.0',
    'https://commons.wikimedia.org/wiki/File:Hyundai_Ioniq_5_N_Line_IMG_3869.jpg',
    'Hyundai Motor Türkiye digital brochure',
    'https://www.hyundai.com/content/dam/hyundai/downloads/tr/tr/brosurler/ioniq5-digital-brosur.pdf',
    date '2026-10-26',
    'Range and consumption refer to the 84 kWh rear-wheel-drive configuration. The brochure quotes an 18-minute 10-80% session on a 350 kW charger.',
    4
  ),
  (
    'byd-sealion-7-design-160-kw-2026',
    'BYD', 'SEALION 7', '160 kW Design', 2026,
    71.8, 'manufacturer', 440, 18.7, 'SUV', 'rear', 11, 180, 7.8, 210,
    '/vehicles/byd-sealion-7.jpg', 'Alexander-93', 'CC BY-SA 4.0',
    'https://commons.wikimedia.org/wiki/File:BYD_Sealion_7_Classic-Gala_2025_DSC_0775.jpg',
    'BYD Türkiye technical specification sheet',
    'https://www.bydauto.com.tr/storage/pdf/teknik/byd-sealion-7-teknik-ozellikler-ve-donanim-tablosu-23-01-26.pdf',
    date '2026-10-26',
    'Combined WLTP values for the 160 kW rear-wheel-drive Design configuration.',
    5
  ),
  (
    'renault-megane-e-tech-techno-2026',
    'Renault', 'Megane E-Tech', 'Techno 60 kWh', 2026,
    60, 'manufacturer', 468, 15.2, 'Hatchback', 'front', 22, 130, null, null,
    '/vehicles/renault-megane-e-tech.jpg', 'Alexander Migl', 'CC BY-SA 4.0',
    'https://commons.wikimedia.org/wiki/File:Renault_Megane_E-Tech_IAA_2021_1X7A0073.jpg',
    'Renault Türkiye',
    'https://www.renault.com.tr/elektrikli-araclar/megane-e-tech-elektrikli.html',
    date '2026-10-26',
    'Consumption is Renault Turkey''s approximate WLTP certification-cycle value. Range is the published maximum for the 60 kWh configuration.',
    6
  ),
  (
    'mg-mg4-luxury-2025',
    'MG', 'MG4 Electric', 'Luxury 64 kWh', 2025,
    64, 'manufacturer', 435, 16.6, 'Hatchback', 'rear', 11, 140, 7.9, 160,
    '/vehicles/mg-mg4.jpg', 'Matti Blume', 'CC BY-SA 4.0',
    'https://commons.wikimedia.org/wiki/File:MG4_EV,_Worms_(P1180575).jpg',
    'MG Türkiye brochure',
    'https://www.mg-turkey.com/upi/file/mg-mg4-brosur.pdf',
    date '2026-10-26',
    'Combined WLTP values for the Luxury 64 kWh configuration.',
    7
  ),
  (
    'citroen-ec3-83-kw-2026',
    'Citroën', 'ë-C3', '83 kW Electric', 2026,
    44, 'manufacturer', 320, 17.4, 'Hatchback', 'front', 11, 100, 10.4, 132,
    '/vehicles/citroen-ec3.jpg', 'Alexander Migl', 'CC BY-SA 4.0',
    'https://commons.wikimedia.org/wiki/File:Citroen_%C3%AB-C3_DSC_2956.jpg',
    'Citroën Türkiye technical sheet',
    'https://talep.citroen.com.tr/api/model-pdf?model=yeni-ec3',
    date '2026-10-26',
    'Combined WLTP values for the 83 kW electric configuration.',
    8
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
  is_active = true,
  updated_at = now();
