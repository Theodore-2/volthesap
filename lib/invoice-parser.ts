export type InvoiceLineItemCategory =
  | "energy"
  | "distribution"
  | "tax"
  | "fund"
  | "fixed_fee"
  | "discount"
  | "other";

export type InvoiceLineItem = {
  category: InvoiceLineItemCategory;
  label: string;
  amount: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  taxRatePercent?: number;
};

export type InvoiceResult = {
  kwh: number;
  total: number;
  rate: number;
  confidence: number;
  lineItems: InvoiceLineItem[];
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
};

export function parseLocaleNumber(value?: string) {
  if (!value) return null;

  let normalized = value
    .replace(/\s/g, "")
    .replace(/₺|TL|TRY/gi, "");

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function firstNumber(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = parseLocaleNumber(match?.[1]);
    if (value !== null) return value;
  }

  return null;
}

function extractLineItem(
  text: string,
  category: InvoiceLineItemCategory,
  label: string,
  patterns: RegExp[],
  detailsPatterns: RegExp[] = [],
  taxRatePatterns: RegExp[] = [],
): InvoiceLineItem | null {
  for (const pattern of detailsPatterns) {
    const match = text.match(pattern);
    const quantity = parseLocaleNumber(match?.[1]);
    const unitPrice = parseLocaleNumber(match?.[2]);
    const amount = parseLocaleNumber(match?.[3]);
    if (quantity !== null && unitPrice !== null && amount !== null) {
      return { category, label, amount, quantity, unit: "kWh", unitPrice };
    }
  }

  const amount = firstNumber(text, patterns);
  if (amount === null) return null;
  const taxRatePercent = firstNumber(text, taxRatePatterns);
  return { category, label, amount, ...(taxRatePercent === null ? {} : { taxRatePercent }) };
}

export function extractInvoice(text: string): InvoiceResult | null {
  const clean = text.normalize("NFKC").replace(/\s+/g, " ").trim();
  const billingPeriod = clean.match(
    /okuma\s*(?:\(gün\))?[^\d]{0,20}(\d{2}[./]\d{2}[./]\d{4})[^\d]{0,20}(\d{2}[./]\d{2}[./]\d{4})/i,
  );

  const detectedKwh = firstNumber(clean, [
    /(?:toplam\s+)?(?:aktif\s+)?(?:enerji\s+)?tüketim(?:\s+miktarı)?[^\d]{0,45}([\d.,]+)\s*kwh/i,
    /(?:fatura\s+)?tüketimi[^\d]{0,35}([\d.,]+)\s*kwh/i,
    /aktif\s+enerji\s+tüketim\s+bedeli[^\d]{0,30}([\d.,]+)/i,
    /([\d.,]+)\s*kwh(?!\s*\/)/i,
  ]);

  const total = firstNumber(clean, [
    /(?:ödenecek\s+tutar|fatura\s+tutarı|genel\s+toplam|toplam\s+tutar)[^\d]{0,35}([\d.,]+)\s*(?:tl|₺|try)/i,
    /(?:ödenecek\s+tutar|fatura\s+tutarı|genel\s+toplam)[^\d]{0,35}([\d.,]+)/i,
  ]);

  if (detectedKwh === null || total === null || detectedKwh <= 0 || total < 0) return null;

  const candidates = [
    extractLineItem(clean, "energy", "Aktif enerji bedeli", [
      /(?:aktif\s+)?enerji\s+(?:tüketim\s+)?bedeli[^\d]{0,35}([\d.,]+)\s*(?:tl|₺|try)/i,
      /tüketim\s+bedeli[^\d]{0,35}([\d.,]+)\s*(?:tl|₺|try)/i,
    ], [
      /(?:aktif\s+)?enerji\s+(?:tüketim\s+)?bedeli[^\d]{0,20}([\d.,]+)\s*kwh[^\d]{0,20}([\d.,]+)\s*(?:tl|₺|try)?\s*\/?\s*kwh[^\d]{0,20}([\d.,]+)\s*(?:tl|₺|try)/i,
      /(?:aktif\s+)?enerji\s+(?:tüketim\s+)?bedeli[^\d]{0,20}([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)(?:\s*(?:tl|₺|try))?/i,
    ]),
    extractLineItem(clean, "distribution", "Dağıtım bedeli", [
      /dağıtım\s+bedeli[^\d]{0,35}([\d.,]+)\s*(?:tl|₺|try)/i,
    ], [
      /dağıtım\s+bedeli[^\d]{0,20}([\d.,]+)\s*kwh[^\d]{0,20}([\d.,]+)\s*(?:tl|₺|try)?\s*\/?\s*kwh[^\d]{0,20}([\d.,]+)\s*(?:tl|₺|try)/i,
      /(?:elk\.?\s*)?dağıtım\s+bedeli[^\d]{0,20}([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)(?:\s*(?:tl|₺|try))?/i,
    ]),
    extractLineItem(clean, "tax", "Elektrik tüketim vergisi", [
      /(?:elektrik\s+tüketim\s+vergisi|belediye\s+tüketim\s+vergisi|btv)[^\d%]{0,20}%\s*[\d.,]+[^\d]{0,20}([\d.,]+)\s*(?:tl|₺|try)/i,
      /(?:elektrik\s+tüketim\s+vergisi|belediye\s+tüketim\s+vergisi|btv)[^\d]{0,35}([\d.,]+)\s*(?:tl|₺|try)/i,
      /elekt\.?\s*ve\s*hvg\.?\s*tük\.?\s*ver\.?[^\d]{0,35}([\d.,]+)/i,
    ], [], [
      /(?:elektrik\s+tüketim\s+vergisi|belediye\s+tüketim\s+vergisi|btv)[^\d%]{0,20}%\s*([\d.,]+)/i,
    ]),
    extractLineItem(clean, "tax", "KDV", [
      /(?:katma\s+değer\s+vergisi|kdv)[^\d%]{0,20}%\s*[\d.,]+[^\d]{0,20}[\d.,]+\s*(?:tl|₺|try)?[^\d]{0,20}([\d.,]+)\s*(?:tl|₺|try)/i,
      /(?:katma\s+değer\s+vergisi|kdv)[^\d%]{0,20}%\s*[\d.,]+[^\d]{0,20}([\d.,]+)\s*(?:tl|₺|try)/i,
      /(?:katma\s+değer\s+vergisi|kdv)[^\d]{0,35}([\d.,]+)\s*(?:tl|₺|try)/i,
    ], [], [
      /(?:katma\s+değer\s+vergisi|kdv)[^\d%]{0,20}%\s*([\d.,]+)/i,
    ]),
    extractLineItem(clean, "fund", "Enerji fonu", [
      /enerji\s+fonu[^\d]{0,35}([\d.,]+)\s*(?:tl|₺|try)/i,
    ]),
    extractLineItem(clean, "discount", "İndirim", [
      /(?:indirim|iskonto)[^\d]{0,35}([\d.,]+)\s*(?:tl|₺|try)/i,
    ]),
  ];

  let lineItems = candidates.filter((item): item is InvoiceLineItem => item !== null);

  // OCR can lose a decimal separator in dense invoice tables. Enerjisa repeats
  // the metered consumption on both the energy and distribution rows, so those
  // quantities are a safer source than an implausibly large standalone reading.
  const meteredQuantity = lineItems.find(
    (item) => (item.category === "energy" || item.category === "distribution")
      && item.quantity !== undefined
      && item.quantity > 0
      && item.quantity < 100_000,
  )?.quantity;
  const kwh = meteredQuantity !== undefined
    && (detectedKwh > meteredQuantity * 10 || Math.abs(detectedKwh - meteredQuantity) / meteredQuantity > 0.05)
    ? meteredQuantity
    : detectedKwh;

  const hasDetailedTax = lineItems.some((item) => item.category === "tax");
  if (!hasDetailedTax) {
    const taxAndFunds = firstNumber(clean, [
      /vergi\s+ve\s+fonlar[^\d]{0,35}([\d.,]+)/i,
    ]);
    if (taxAndFunds !== null) lineItems.push({ category: "fund", label: "Vergi ve fonlar", amount: taxAndFunds });
  }

  lineItems = lineItems.map((item) => {
    let amount = item.amount;
    // A missing decimal separator commonly turns 1.052,85 into 105.285.
    // Invoice line items cannot be larger than the entire invoice, so repair
    // that OCR error conservatively by restoring two decimal places.
    while (amount > total * 1.05 && amount >= 100) amount /= 100;
    if (item.quantity === undefined || item.quantity <= 0 || amount < 0) return { ...item, amount };
    const calculatedUnitPrice = amount / item.quantity;
    const reportedSubtotal = item.unitPrice === undefined ? null : item.quantity * item.unitPrice;
    const unitPriceLooksWrong = item.unitPrice === undefined
      || item.unitPrice <= 0
      || item.unitPrice > 100
      || (reportedSubtotal !== null && Math.abs(reportedSubtotal - amount) > Math.max(1, amount * 0.05));
    return { ...item, amount, ...(unitPriceLooksWrong ? { unitPrice: calculatedUnitPrice } : {}) };
  });

  if (!lineItems.some((item) => item.category === "energy")) {
    const knownCharges = lineItems.reduce(
      (sum, item) => sum + (item.category === "discount" ? -item.amount : item.amount),
      0,
    );
    const inferredEnergyAmount = total - knownCharges;
    if (inferredEnergyAmount > 0 && inferredEnergyAmount < total) {
      lineItems.push({
        category: "energy",
        label: "Aktif enerji bedeli (toplamdan hesaplandı)",
        amount: inferredEnergyAmount,
        quantity: kwh,
        unit: "kWh",
        unitPrice: inferredEnergyAmount / kwh,
      });
    }
  }

  const categoryOrder: Record<InvoiceLineItemCategory, number> = {
    energy: 0,
    distribution: 1,
    tax: 2,
    fund: 3,
    fixed_fee: 4,
    discount: 5,
    other: 6,
  };
  lineItems.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
  const lineItemTotal = lineItems.reduce(
    (sum, item) => sum + (item.category === "discount" ? -item.amount : item.amount),
    0,
  );
  const matchesTotal = lineItems.length > 0 && Math.abs(lineItemTotal - total) <= Math.max(1, total * 0.03);
  const confidence = Math.min(1, 0.7 + (lineItems.length > 0 ? 0.15 : 0) + (matchesTotal ? 0.15 : 0));

  return {
    kwh,
    total,
    rate: total / kwh,
    confidence,
    lineItems,
    ...(billingPeriod ? {
      billingPeriodStart: billingPeriod[1].replaceAll("/", "."),
      billingPeriodEnd: billingPeriod[2].replaceAll("/", "."),
    } : {}),
  };
}
