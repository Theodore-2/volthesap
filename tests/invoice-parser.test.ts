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

test("does not report partial or invalid invoices", () => {
  assert.equal(extractInvoice("Ödenecek tutar 500,00 TL"), null);
  assert.equal(extractInvoice("Tüketim 0 kWh Genel toplam 0 TL"), null);
});
