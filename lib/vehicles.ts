export type VehicleCatalogItem = {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  modelYear: number | null;
  batteryCapacityKwh: number | null;
  batteryCapacityBasis: "gross" | "usable" | "manufacturer" | null;
  wltpRangeKm: number | null;
  consumptionKwh100Km: number;
  bodyType: string | null;
  drivetrain: "front" | "rear" | "all" | null;
  acChargePowerKw: number | null;
  dcChargePowerKw: number | null;
  acceleration0100S: number | null;
  topSpeedKmh: number | null;
  imageUrl: string | null;
  imageCredit: string | null;
  imageLicense: string | null;
  imageSourceUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  specificationNotes: string | null;
};

export const VEHICLE_CATALOG_SELECT = "id, slug, make, model, variant, model_year, battery_capacity_kwh, battery_capacity_basis, wltp_range_km, consumption_kwh_100km, body_type, drivetrain, ac_charge_power_kw, dc_charge_power_kw, acceleration_0_100_s, top_speed_kmh, image_url, image_credit, image_license, image_source_url, source_name, source_url, specification_notes";

export type VehicleCatalogRow = {
  id: number;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  model_year: number | null;
  battery_capacity_kwh: number | null;
  battery_capacity_basis: VehicleCatalogItem["batteryCapacityBasis"];
  wltp_range_km: number | null;
  consumption_kwh_100km: number | string;
  body_type: string | null;
  drivetrain: VehicleCatalogItem["drivetrain"];
  ac_charge_power_kw: number | null;
  dc_charge_power_kw: number | null;
  acceleration_0_100_s: number | null;
  top_speed_kmh: number | null;
  image_url: string | null;
  image_credit: string | null;
  image_license: string | null;
  image_source_url: string | null;
  source_name: string | null;
  source_url: string | null;
  specification_notes: string | null;
};

export function mapVehicleRow(row: VehicleCatalogRow): VehicleCatalogItem {
  return {
    id: String(row.id),
    slug: row.slug,
    make: row.make,
    model: row.model,
    variant: row.variant,
    modelYear: row.model_year,
    batteryCapacityKwh: row.battery_capacity_kwh === null ? null : Number(row.battery_capacity_kwh),
    batteryCapacityBasis: row.battery_capacity_basis,
    wltpRangeKm: row.wltp_range_km === null ? null : Number(row.wltp_range_km),
    consumptionKwh100Km: Number(row.consumption_kwh_100km),
    bodyType: row.body_type,
    drivetrain: row.drivetrain,
    acChargePowerKw: row.ac_charge_power_kw === null ? null : Number(row.ac_charge_power_kw),
    dcChargePowerKw: row.dc_charge_power_kw === null ? null : Number(row.dc_charge_power_kw),
    acceleration0100S: row.acceleration_0_100_s === null ? null : Number(row.acceleration_0_100_s),
    topSpeedKmh: row.top_speed_kmh,
    imageUrl: row.image_url,
    imageCredit: row.image_credit,
    imageLicense: row.image_license,
    imageSourceUrl: row.image_source_url,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    specificationNotes: row.specification_notes,
  };
}
