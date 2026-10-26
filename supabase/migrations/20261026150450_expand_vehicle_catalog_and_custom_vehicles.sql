alter table public.user_vehicles
  alter column vehicle_id drop not null,
  add column custom_make text,
  add column custom_model text,
  add column custom_variant text,
  add column custom_battery_capacity_kwh numeric(7, 2);

alter table public.user_vehicles
  add constraint user_vehicles_custom_make_length check (
    custom_make is null or char_length(custom_make) between 1 and 80
  ),
  add constraint user_vehicles_custom_model_length check (
    custom_model is null or char_length(custom_model) between 1 and 120
  ),
  add constraint user_vehicles_custom_variant_length check (
    custom_variant is null or char_length(custom_variant) between 1 and 120
  ),
  add constraint user_vehicles_custom_battery_positive check (
    custom_battery_capacity_kwh is null or custom_battery_capacity_kwh > 0
  ),
  add constraint user_vehicles_catalog_or_custom check (
    (
      vehicle_id is not null
      and custom_make is null
      and custom_model is null
      and custom_variant is null
      and custom_battery_capacity_kwh is null
    )
    or
    (
      vehicle_id is null
      and custom_make is not null
      and custom_model is not null
      and custom_battery_capacity_kwh is not null
      and custom_consumption_kwh_100km is not null
    )
  );

create index user_vehicles_custom_catalog_idx
  on public.user_vehicles (user_id, created_at desc)
  where vehicle_id is null;

insert into public.vehicles (
  slug, make, model, variant, model_year, battery_capacity_kwh,
  battery_capacity_basis, wltp_range_km, consumption_kwh_100km,
  body_type, drivetrain, ac_charge_power_kw, dc_charge_power_kw,
  acceleration_0_100_s, top_speed_kmh, image_url, source_name,
  source_url, specification_date, specification_notes, featured_rank, is_active
)
values
  ('tesla-model-3-premium-long-range-rwd-2026', 'Tesla', 'Model 3', 'Premium Long Range RWD', 2026, null, null, null, 13.60, 'Sedan', 'rear', 11, 250, null, null, null, 'Tesla Türkiye', 'https://www.tesla.com/tr_tr/support/power-consumption', '2026-10-26', 'Tesla does not publish battery capacity for this configuration. The consumption value is the manufacturer-published combined WLTP figure.', 9, true),
  ('volvo-ex30-p4-long-range-2026', 'Volvo', 'EX30', 'P4 Long Range', 2026, 69, 'manufacturer', 475, 17.00, 'SUV', 'rear', 22, 175, 6.50, 180, null, 'Volvo Cars Türkiye', 'https://www.volvocars.com/tr/cars/ex30-electric/specifications/', '2026-10-26', 'Manufacturer figures for the rear-wheel-drive P4 Long Range configuration.', 10, true),
  ('bmw-ix1-edrive20-2026', 'BMW', 'iX1', 'eDrive20', 2026, 64.80, 'manufacturer', 516, 15.90, 'SUV', 'front', 22, 130, 8.60, 170, null, 'BMW Türkiye', 'https://www.bmw.com.tr/tr/all-models/i-series/ix1/bmw-ix1-technical-data.html', '2026-10-26', 'The catalogue uses the most efficient published WLTP range and consumption values; equipment can change the result.', 11, true),
  ('kia-ev3-long-range-2025', 'Kia', 'EV3', 'Long Range Elegance, 17-inch', 2025, 81.40, 'manufacturer', 604, 14.90, 'SUV', 'front', 11, 128, 7.70, 170, null, 'Kia Türkiye EV3 technical sheet', 'https://www.kia.com/content/dam/kwcms/tr/tr/files/brosur/2025/01-01-25/Kia-EV3-MY25-F%C3%B6y_16122024.pdf', '2026-10-26', 'WLTP figures for the 81.4 kWh Long Range configuration with 17-inch wheels.', 12, true),
  ('kia-ev6-elegance-rwd-2026', 'Kia', 'EV6', 'Elegance RWD 125 kW', 2026, 63, 'manufacturer', 428, 16.40, 'Crossover', 'rear', 11, 195, 8.70, 186, null, 'Kia Türkiye', 'https://www.kia.com/tr/modeller/ev6/teknik-ozellikler.html', '2026-10-26', 'Manufacturer figures for the Turkey-market 63 kWh rear-wheel-drive Elegance configuration.', 13, true),
  ('skoda-enyaq-e-prestige-60-2026', 'Škoda', 'Enyaq', 'e-Prestige 60', 2026, 61, 'manufacturer', 456, 15.00, 'SUV', 'rear', 11, 105, 8.50, 160, null, 'Škoda Türkiye', 'https://www.skoda.com.tr/modeller/enyaq', '2026-10-26', 'The catalogue uses the best published combined WLTP range and consumption within the equipment-dependent range.', 14, true),
  ('peugeot-e-208-100-kw-2025', 'Peugeot', 'E-208', '100 kW', 2025, 50, 'manufacturer', 363, 15.40, 'Hatchback', 'front', 11, 100, null, null, null, 'Peugeot Türkiye technical brochure', 'https://www.peugeot.com.tr/content/dam/peugeot/turkey/b2c/brosurler/2025/nisan/0009_E-208_teknik-brosur.pdf', '2026-10-26', 'Combined WLTP values from the official Turkey technical brochure.', 15, true),
  ('hyundai-kona-electric-48-6-kwh-2025', 'Hyundai', 'KONA Electric', '48.6 kWh', 2025, 48.60, 'manufacturer', 380, 14.60, 'SUV', 'front', 10.40, 100, 9.90, 162, null, 'Hyundai Motor Türkiye brochure', 'https://www.hyundai.com/content/dam/hyundai/tr/tr/data/marketing/brochure/product/kona-ev/kona-ev-brosur.pdf', '2026-10-26', 'Combined WLTP figures for the current 48.6 kWh configuration.', 16, true),
  ('byd-atto-3-design-2026', 'BYD', 'ATTO 3', 'Design', 2026, 60.48, 'manufacturer', 420, 16.00, 'SUV', 'front', 11, 88, 7.30, 160, null, 'BYD Türkiye', 'https://www.bydauto.com.tr/atto3', '2026-10-26', 'Combined WLTP values for the Turkey-market Design configuration.', 17, true),
  ('byd-dolphin-design-2026', 'BYD', 'DOLPHIN', 'Design', 2026, 60.40, 'manufacturer', 427, 15.90, 'Hatchback', 'front', 11, 110, 7.00, 160, null, 'BYD Türkiye technical sheet', 'https://www.bydauto.com.tr/storage/pdf/teknik/byd-dolphin-teknik-ozellikler-ve-donanim-tablosu-01-02-26.pdf', '2026-10-26', 'Combined WLTP values for the 60.4 kWh configuration.', 18, true)
on conflict (slug) do update set
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
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  specification_date = excluded.specification_date,
  specification_notes = excluded.specification_notes,
  featured_rank = excluded.featured_rank,
  is_active = excluded.is_active,
  updated_at = now();
