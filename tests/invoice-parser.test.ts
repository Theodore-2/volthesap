import assert from "node:assert/strict";
import test from "node:test";

import { extractInvoice, parseLocaleNumber } from "../lib/invoice-parser.ts";

test("parses Turkish decimal and thousands separators", () => {
  assert.equal(parseLocaleNumber("1.234,56 TL"), 1234.56);
  assert.equal(parseLocaleNumber("237,450"), 237.45);
  assert.equal(parseLocaleNumber("1.234"), 1234);
});

test("extracts consumption and payable total", () => {
  const result = extractInvoice(
    "Toplam tüketim 237,450 kWh Ödenecek tutar 864,27 TL",
  );

  assert.ok(result);
  assert.equal(result.kwh, 237.45);
  assert.equal(result.total, 864.27);
  assert.equal(Number(result.rate.toFixed(4)), 3.6398);
  assert.equal(result.confidence, 0.7);
});

test("extracts a detailed Turkish electricity bill breakdown", () => {
  const result = extractInvoice(
    [
      "Tüketim miktarı 182,75 kWh",
      "Enerji tüketim bedeli 312,40 TL",
      "Dağıtım bedeli 205,11 TL",
      "BTV 25,99 TL",
      "KDV 108,15 TL",
      "Genel toplam 651,65 TL",
    ].join(" "),
  );

  assert.ok(result);
  assert.equal(result.lineItems.length, 4);
  assert.equal(result.lineItems[1].category, "distribution");
  assert.equal(result.confidence, 1);
});

test("extracts invoice multipliers and tax rates", () => {
  const result = extractInvoice(
    [
      "Toplam tüketim 182,75 kWh",
      "Enerji tüketim bedeli 182,75 kWh x 1,70944 TL/kWh = 312,40 TL",
      "Dağıtım bedeli 182,75 kWh x 1,12235 TL/kWh = 205,11 TL",
      "BTV %5 25,99 TL",
      "KDV %20 108,15 TL",
      "Genel toplam 651,65 TL",
    ].join(" "),
  );

  assert.ok(result);
  assert.equal(result.lineItems[0].quantity, 182.75);
  assert.equal(result.lineItems[0].unitPrice, 1.70944);
  assert.equal(result.lineItems[1].unitPrice, 1.12235);
  assert.equal(result.lineItems[2].taxRatePercent, 5);
  assert.equal(result.lineItems[3].taxRatePercent, 20);
});

test("extracts Enerjisa table values from OCR text", () => {
  const result = extractInvoice(
    [
      "Ödenecek Tutar 9.310,00 TL",
      "Aktif Enerji Tüketim Bedeli 1.387,922 3,50000000 4.857,73",
      "Elk. Dağıtım Bedeli 1.387,922 2,42490000 3.365,57",
      "Elekt. ve Hvg. Tük. Ver. 242,89",
      "KDV %10 (Matrah 8.466,19 TL) 846,62 TL",
      "Fatura Tutarı 9.312,81 TL",
    ].join(" "),
  );

  assert.ok(result);
  assert.equal(result.kwh, 1387.922);
  assert.equal(result.total, 9310);
  assert.equal(result.lineItems[0].amount, 4857.73);
  assert.equal(result.lineItems[0].unitPrice, 3.5);
  assert.equal(result.lineItems[1].amount, 3365.57);
  assert.equal(result.lineItems[1].unitPrice, 2.4249);
  assert.equal(result.lineItems[2].amount, 242.89);
  assert.equal(result.lineItems[3].amount, 846.62);
});

test("reconciles noisy Enerjisa OCR values with invoice table totals", () => {
  const result = extractInvoice(
    [
      "ÖDENECEK TUTAR 8.935,00",
      "Aktif Enerji Tüketim Bedeli 1.262,680 3,81499667 4.817,12",
      "Elk. Dağıtım Bedeli 1.262,680 242.490.000 3.061,87",
      "Vergi ve Fonlar 1.052,85",
      "Elekt. ve Hvg. Tük. Ver. 240,86",
      "KDV %10 (Matrah 8.119,85 TL) 811,99 TL",
      "Fatura Tutarı 8.931,84",
      "Aktif Enerji Tüketim Bedeli 1.202.680 kWh",
    ].join(" "),
  );

  assert.ok(result);
  assert.equal(result.kwh, 1262.68);
  assert.equal(result.total, 8935);
  assert.equal(Number(result.rate.toFixed(4)), 7.0762);
  assert.equal(result.lineItems[0].amount, 4817.12);
  assert.equal(Number(result.lineItems[0].unitPrice?.toFixed(8)), 3.81499667);
  assert.equal(result.lineItems[1].amount, 3061.87);
  assert.equal(Number(result.lineItems[1].unitPrice?.toFixed(4)), 2.4249);
  assert.equal(result.lineItems[2].amount, 240.86);
  assert.equal(result.lineItems[3].amount, 811.99);
});

test("repairs a shifted tax decimal and infers a missing energy row", () => {
  const result = extractInvoice(
    [
      "Okuma (Gün) 23.06.2026 27.07.2026 35",
      "Aktif Enerji Tüketim Bedeli 1.202.680 kWh",
      "Elk. Dağıtım Bedeli 1.262,680 2,42490000 3.061,87",
      "Vergi ve Fonlar 105.285",
      "Fatura Tutarı 8.931,84 TL",
    ].join(" "),
  );

  assert.ok(result);
  assert.equal(result.kwh, 1262.68);
  assert.equal(result.billingPeriodStart, "23.06.2026");
  assert.equal(result.billingPeriodEnd, "27.07.2026");
  assert.equal(result.lineItems[0].category, "energy");
  assert.equal(Number(result.lineItems[0].amount.toFixed(2)), 4817.12);
  assert.equal(Number(result.lineItems[0].unitPrice?.toFixed(8)), 3.81499667);
  assert.equal(result.lineItems[1].amount, 3061.87);
  assert.equal(result.lineItems[2].amount, 1052.85);
});

test("does not report partial or invalid invoices", () => {
  assert.equal(extractInvoice("Ödenecek tutar 500,00 TL"), null);
  assert.equal(extractInvoice("Tüketim 0 kWh Genel toplam 0 TL"), null);
});
