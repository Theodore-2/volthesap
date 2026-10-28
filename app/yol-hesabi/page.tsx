import type { Metadata } from "next";
import { CalculatorPage } from "@/app/calculator-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Yol maliyeti hesaplama",
  description: "Elektrikli araç yolculuğundaki şarj oturumlarını ekle, toplam maliyeti ve yakıtlı araç karşılığını hesapla.",
  alternates: { canonical: "/yol-hesabi" },
  openGraph: { url: "/yol-hesabi" },
};

export default function TripCalculatorPage() {
  return <CalculatorPage mode="trip" />;
}
