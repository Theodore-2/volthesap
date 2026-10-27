import { VoltHesap } from "@/components/volthesap";
import { createClient } from "@/lib/supabase/server";
import { mapVehicleRow, VEHICLE_CATALOG_SELECT, type VehicleCatalogRow } from "@/lib/vehicles";

export const instant = false;

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select(VEHICLE_CATALOG_SELECT)
    .eq("is_active", true)
    .order("featured_rank", { ascending: true });

  const initialVehicles = data?.length
    ? (data as unknown as VehicleCatalogRow[]).map(mapVehicleRow)
    : [];

  return <VoltHesap initialVehicles={initialVehicles} />;
}
