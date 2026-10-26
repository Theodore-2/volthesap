export type ChargingTariffOption = {
  id: string;
  network: string;
  connectorType: "AC" | "DC" | "HPC";
  priceMin: number;
  priceMax: number;
  powerMinKw: number | null;
  powerMaxKw: number | null;
  sourceUrl: string;
  observedAt: string;
};

// Resilient guest fallback. Supabase remains the managed source after migrations are applied.
export const fallbackChargingTariffs: ChargingTariffOption[] = [
  { id: "trugo-ac", network: "Trugo", connectorType: "AC", priceMin: 9.95, priceMax: 9.95, powerMinKw: null, powerMaxKw: null, sourceUrl: "https://www.trugo.com.tr/price", observedAt: "2026-10-26" },
  { id: "trugo-dc", network: "Trugo", connectorType: "DC", priceMin: 12, priceMax: 14.98, powerMinKw: null, powerMaxKw: null, sourceUrl: "https://www.trugo.com.tr/price", observedAt: "2026-10-26" },
  { id: "zes-ac", network: "ZES", connectorType: "AC", priceMin: 10.99, priceMax: 10.99, powerMinKw: 3.7, powerMaxKw: 22, sourceUrl: "https://zes.net/tr/fiyatlandirma", observedAt: "2026-10-26" },
  { id: "zes-dc-1", network: "ZES", connectorType: "DC", priceMin: 12.99, priceMax: 12.99, powerMinKw: 60, powerMaxKw: 60, sourceUrl: "https://zes.net/tr/fiyatlandirma", observedAt: "2026-10-26" },
  { id: "zes-dc-2", network: "ZES", connectorType: "HPC", priceMin: 16.49, priceMax: 16.49, powerMinKw: 180, powerMaxKw: 720, sourceUrl: "https://zes.net/tr/fiyatlandirma", observedAt: "2026-10-26" },
  { id: "voltrun-ac", network: "Voltrun", connectorType: "AC", priceMin: 9.9, priceMax: 9.9, powerMinKw: 7.4, powerMaxKw: 22, sourceUrl: "https://www.voltrun.com/tr/tarifeler", observedAt: "2026-10-26" },
  { id: "voltrun-dc", network: "Voltrun", connectorType: "DC", priceMin: 12.9, priceMax: 12.9, powerMinKw: 80, powerMaxKw: 500, sourceUrl: "https://www.voltrun.com/tr/tarifeler", observedAt: "2026-10-26" },
  { id: "oncharge-ac", network: "Oncharge", connectorType: "AC", priceMin: 9.99, priceMax: 9.99, powerMinKw: 22, powerMaxKw: 22, sourceUrl: "https://oncharge.com.tr/fiyatlar", observedAt: "2026-10-26" },
  { id: "oncharge-dc", network: "Oncharge", connectorType: "DC", priceMin: 13.5, priceMax: 13.5, powerMinKw: 40, powerMaxKw: 720, sourceUrl: "https://oncharge.com.tr/fiyatlar", observedAt: "2026-10-26" },
  { id: "astor-ac", network: "Astor Şarj", connectorType: "AC", priceMin: 9.89, priceMax: 9.89, powerMinKw: 22, powerMaxKw: 22, sourceUrl: "https://astorsarj.com.tr/", observedAt: "2026-10-26" },
  { id: "astor-dc", network: "Astor Şarj", connectorType: "DC", priceMin: 13.99, priceMax: 13.99, powerMinKw: 60, powerMaxKw: 300, sourceUrl: "https://astorsarj.com.tr/", observedAt: "2026-10-26" },
];

export function formatTariffLabel(tariff: ChargingTariffOption) {
  const price = tariff.priceMin === tariff.priceMax
    ? `${tariff.priceMin.toFixed(2)} ₺/kWh`
    : `${tariff.priceMin.toFixed(2)}–${tariff.priceMax.toFixed(2)} ₺/kWh`;
  const power = tariff.powerMaxKw === null
    ? "güç lokasyona göre"
    : tariff.powerMinKw === tariff.powerMaxKw
      ? `${tariff.powerMaxKw} kW`
      : `${tariff.powerMinKw}–${tariff.powerMaxKw} kW`;

  return `${tariff.network} · ${tariff.connectorType} · ${power} · ${price}`;
}
