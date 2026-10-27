-- Tesla does not publish usable battery capacity for these configurations.
-- The values below are clearly labelled catalogue estimates and must not be
-- presented as manufacturer-confirmed specifications.

update public.vehicles
set
  battery_capacity_kwh = 60,
  battery_capacity_basis = 'usable',
  wltp_range_km = 534,
  specification_notes = 'WLTP range is configuration-dependent. Usable battery capacity is a third-party catalogue estimate because Tesla does not publish it for this configuration.',
  updated_at = now()
where slug = 'tesla-model-y-rwd-standard-2026';

update public.vehicles
set
  battery_capacity_kwh = 60,
  battery_capacity_basis = 'usable',
  wltp_range_km = 534,
  specification_notes = 'WLTP range is configuration-dependent. Usable battery capacity is a third-party catalogue estimate because Tesla does not publish it for this configuration.',
  updated_at = now()
where slug = 'tesla-model-y-premium-rwd-2026';

update public.vehicles
set
  battery_capacity_kwh = 75,
  battery_capacity_basis = 'usable',
  wltp_range_km = 622,
  specification_notes = 'The catalogue uses a 622 km combined WLTP range and an approximately 75 kWh usable battery capacity.',
  updated_at = now()
where slug = 'tesla-model-y-premium-long-range-rwd-2026';

update public.vehicles
set
  battery_capacity_kwh = 60,
  battery_capacity_basis = 'usable',
  specification_notes = 'Usable battery capacity is a third-party catalogue estimate because Tesla does not publish it for this configuration.',
  updated_at = now()
where slug = 'tesla-model-3-premium-rwd-2026';

update public.vehicles
set
  battery_capacity_kwh = 79,
  battery_capacity_basis = 'usable',
  specification_notes = 'Usable battery capacity is a third-party catalogue estimate because Tesla does not publish it for this configuration.',
  updated_at = now()
where slug = 'tesla-model-3-premium-long-range-rwd-2026';
