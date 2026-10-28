import type { Metadata } from "next";
import { CalculatorPage } from "@/app/calculator-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Evde şarj ve elektrik faturası",
  description: "Elektrik faturanı cihazında analiz et, elektrikli aracının fatura payını ve gerçek kWh maliyetini gör.",
  alternates: { canonical: "/ev-ve-fatura" },
  openGraph: { url: "/ev-ve-fatura" },
};

export default function HomeChargingInvoicePage() {
  return <CalculatorPage mode="home" />;
}
