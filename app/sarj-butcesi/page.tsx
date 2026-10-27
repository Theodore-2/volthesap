import type { Metadata } from "next";
import { CalculatorPage } from "@/app/calculator-page";

export const metadata: Metadata = {
  title: "Elektrikli araç şarj bütçesi",
  description: "Ev ve halka açık istasyon şarj alışkanlıklarının 1, 3, 6 ve 12 aylık maliyetini hesapla.",
  alternates: { canonical: "/sarj-butcesi" },
  openGraph: { url: "/sarj-butcesi" },
};

export default function ChargingBudgetPage() {
  return <CalculatorPage mode="budget" />;
}
