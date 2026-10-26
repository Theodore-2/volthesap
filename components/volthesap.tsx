"use client";

import { extractInvoice, type InvoiceResult } from "@/lib/invoice-parser";
import { fallbackChargingTariffs, formatTariffLabel, type ChargingTariffOption } from "@/lib/charging-tariffs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type Values = {
  distance: number;
  annualDistance: number;
  longTripsPerMonth: number;
  averageLongTripDistance: number;
  batteryCapacity: number;
  consumption: number;
  electricity: number;
  publicElectricity: number;
  chargesPerMonth: number;
  startChargePercent: number;
  endChargePercent: number;
  knownKwhPerCharge: number;
  homeChargingPercent: number;
  monthlyElectricityBill: number;
  monthlyWaterBill: number;
  monthlyHeatingBill: number;
  taxAndFundPercent: number;
  homeAmps: number;
  homeVoltage: number;
  homePhases: number;
  chargerPower: number;
  fuelConsumption: number;
  fuelPrice: number;
};

type ChargingSetup = "outlet" | "wallbox" | "public-ac" | "public-dc";
type ChargeInputMode = "percentage" | "energy";
type FuelType = "gasoline" | "diesel";
type CalculatorMode = "trip" | "budget" | "home";

type ChargeSession = {
  id: string;
  tariffId?: string | null;
  provider: string;
  energyKwh: number;
  unitPrice: number;
  setup: ChargingSetup;
};

const defaults: Values = {
  distance: 100,
  annualDistance: 15000,
  longTripsPerMonth: 1,
  averageLongTripDistance: 300,
  batteryCapacity: 60,
  consumption: 17.5,
  electricity: 3,
  publicElectricity: 10,
  chargesPerMonth: 8,
  startChargePercent: 20,
  endChargePercent: 80,
  knownKwhPerCharge: 36,
  homeChargingPercent: 100,
  monthlyElectricityBill: 1000,
  monthlyWaterBill: 500,
  monthlyHeatingBill: 1500,
  taxAndFundPercent: 0,
  homeAmps: 16,
  homeVoltage: 230,
  homePhases: 1,
  chargerPower: 3.7,
  fuelConsumption: 7,
  fuelPrice: 50,
};

const chargingLossRates: Record<ChargingSetup, number> = {
  outlet: 0.15,
  wallbox: 0.1,
  "public-ac": 0.09,
  "public-dc": 0.07,
};
const format = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function VoltHesap() {
  const [mode, setMode] = useState<CalculatorMode>("trip");
  const [values, setValues] = useState<Values>(defaults);
  const [chargingSetup, setChargingSetup] = useState<ChargingSetup>("wallbox");
  const [chargeInputMode, setChargeInputMode] = useState<ChargeInputMode>("percentage");
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");
  const [projectionMonths, setProjectionMonths] = useState(1);
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pdfMessage, setPdfMessage] = useState("");
  const [invoice, setInvoice] = useState<InvoiceResult | null>(null);
  const [manualText, setManualText] = useState("");
  const [tripName, setTripName] = useState("Hafta sonu yolculuğu");
  const [tripDistance, setTripDistance] = useState(240);
  const [sessions, setSessions] = useState<ChargeSession[]>([
    { id: "session-1", tariffId: "trugo-dc", provider: "Trugo", energyKwh: 20, unitPrice: 14.98, setup: "public-dc" },
    { id: "session-2", tariffId: null, provider: "Diğer istasyon", energyKwh: 15, unitPrice: 9.5, setup: "public-dc" },
  ]);
  const [chargingTariffs, setChargingTariffs] = useState<ChargingTariffOption[]>(fallbackChargingTariffs);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // URL parameters are the external source for shareable calculations.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((current) => {
      const next = { ...current };
      (Object.keys(next) as (keyof Values)[]).forEach((key) => { const incoming = Number(params.get(key)); if (Number.isFinite(incoming) && params.has(key)) next[key] = incoming; });
      return next;
    });
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    (Object.keys(values) as (keyof Values)[]).forEach((key) => url.searchParams.set(key, String(values[key])));
    window.history.replaceState(null, "", url);
  }, [values]);

  useEffect(() => {
    const stored = window.localStorage.getItem("volthesap-trip-draft");
    if (!stored) return;
    try {
      const draft = JSON.parse(stored) as { tripName?: string; tripDistance?: number; sessions?: ChargeSession[] };
      // Browser storage is the external source for the guest's local draft.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (draft.tripName) setTripName(draft.tripName);
      if (draft.tripDistance) setTripDistance(draft.tripDistance);
      if (draft.sessions?.length) setSessions(draft.sessions);
    } catch { /* Ignore invalid browser drafts. */ }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("volthesap-trip-draft", JSON.stringify({ tripName, tripDistance, sessions }));
  }, [sessions, tripDistance, tripName]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase
      .from("charging_tariffs")
      .select("id, connector_type, power_min_kw, power_max_kw, unit_price_min, unit_price_max, observed_at, source_url, charging_networks!inner(name)")
      .eq("is_active", true)
      .order("observed_at", { ascending: false })
      .then(({ data }) => {
        if (!active || !data?.length) return;
        const mapped = data.map((row) => {
          const relation = row.charging_networks as unknown as { name: string } | { name: string }[];
          const network = Array.isArray(relation) ? relation[0]?.name : relation?.name;
          return {
            id: String(row.id), network: network ?? "Unknown",
            connectorType: row.connector_type as ChargingTariffOption["connectorType"],
            priceMin: Number(row.unit_price_min), priceMax: Number(row.unit_price_max),
            powerMinKw: row.power_min_kw === null ? null : Number(row.power_min_kw),
            powerMaxKw: row.power_max_kw === null ? null : Number(row.power_max_kw),
            sourceUrl: row.source_url, observedAt: row.observed_at,
          } satisfies ChargingTariffOption;
        });
        // Supabase is the managed source; the bundled snapshot only keeps guest mode resilient.
        setChargingTariffs(mapped);
      });
    return () => { active = false; };
  }, []);

  const result = useMemo(() => {
    const lossRate = chargingLossRates[chargingSetup];
    const lossMultiplier = 1 / (1 - lossRate);
    const homeShare = Math.min(100, values.homeChargingPercent) / 100;
    const weightedElectricityPrice = values.electricity * homeShare + values.publicElectricity * (1 - homeShare);
    const batteryEnergy = values.distance / 100 * values.consumption;
    const energy = batteryEnergy * lossMultiplier;
    const lossEnergy = energy - batteryEnergy;
    const cost = energy * weightedElectricityPrice;
    const fuelLiters = values.distance / 100 * values.fuelConsumption;
    const fuel = fuelLiters * values.fuelPrice;
    const difference = fuel - cost;
    const totalAnnualDistance = values.annualDistance + values.longTripsPerMonth * values.averageLongTripDistance * 12;
    const annualEnergy = totalAnnualDistance / 100 * values.consumption * lossMultiplier;
    const annualEvCost = annualEnergy * weightedElectricityPrice;
    const annualFuelCost = totalAnnualDistance / 100 * values.fuelConsumption * values.fuelPrice;
    const annualSavings = annualFuelCost - annualEvCost;
    const fullChargeEnergy = values.batteryCapacity * lossMultiplier;
    const batteryEnergyPerCharge = chargeInputMode === "energy"
      ? values.knownKwhPerCharge
      : values.batteryCapacity * Math.max(0, values.endChargePercent - values.startChargePercent) / 100;
    const gridEnergyPerCharge = batteryEnergyPerCharge * lossMultiplier;
    const monthlyGridEnergy = gridEnergyPerCharge * values.chargesPerMonth;
    const monthlyHomeGridEnergy = monthlyGridEnergy * homeShare;
    const monthlyPublicGridEnergy = monthlyGridEnergy * (1 - homeShare);
    const monthlyHomeChargingCost = monthlyHomeGridEnergy * values.electricity;
    const monthlyPublicChargingCost = monthlyPublicGridEnergy * values.publicElectricity;
    const monthlyChargingCost = monthlyHomeChargingCost + monthlyPublicChargingCost;
    const taxMultiplier = 1 + Math.max(0, values.taxAndFundPercent) / 100;
    const monthlyHomeCostBeforeTax = monthlyHomeChargingCost / taxMultiplier;
    const monthlyHomeTax = monthlyHomeChargingCost - monthlyHomeCostBeforeTax;
    const electricityBillBeforeEv = Math.max(0, values.monthlyElectricityBill - monthlyHomeChargingCost);
    const electricityBillShare = values.monthlyElectricityBill
      ? monthlyHomeChargingCost / values.monthlyElectricityBill * 100
      : 0;
    const annualHouseholdElectricity = electricityBillBeforeEv * 12;
    const annualWater = values.monthlyWaterBill * 12;
    const annualHeating = values.monthlyHeatingBill * 12;
    let remainingSavings = Math.max(0, annualSavings);
    const electricityCoverage = annualHouseholdElectricity
      ? Math.min(100, remainingSavings / annualHouseholdElectricity * 100)
      : 0;
    remainingSavings = Math.max(0, remainingSavings - annualHouseholdElectricity);
    const waterCoverage = annualWater ? Math.min(100, remainingSavings / annualWater * 100) : 0;
    remainingSavings = Math.max(0, remainingSavings - annualWater);
    const heatingCoverage = annualHeating ? Math.min(100, remainingSavings / annualHeating * 100) : 0;
    const estimatedHomePower = values.homeAmps * values.homeVoltage * values.homePhases / 1000;
    const effectiveHomePower = values.chargerPower || estimatedHomePower;

    return {
      lossRate,
      batteryEnergy,
      energy,
      lossEnergy,
      lossCost: lossEnergy * weightedElectricityPrice,
      cost,
      costPerKm: values.distance ? cost / values.distance : 0,
      fuelLiters,
      fuel,
      difference,
      percentage: fuel ? Math.round(difference / fuel * 100) : 0,
      annualEvCost,
      annualFuelCost,
      annualSavings,
      totalAnnualDistance,
      fullChargeCost: fullChargeEnergy * weightedElectricityPrice,
      estimatedRange: values.consumption ? values.batteryCapacity / values.consumption * 100 : 0,
      breakEvenElectricityPrice: energy ? fuel / energy : 0,
      batteryEnergyPerCharge,
      monthlyGridEnergy,
      monthlyHomeChargingCost,
      monthlyPublicChargingCost,
      monthlyChargingCost,
      effectiveHomePower,
      monthlyHomeHours: effectiveHomePower ? monthlyHomeGridEnergy / effectiveHomePower : 0,
      monthlyHomeCostBeforeTax,
      monthlyHomeTax,
      electricityBillBeforeEv,
      electricityBillShare,
      electricityCoverage,
      waterCoverage,
      heatingCoverage,
    };
  }, [chargeInputMode, chargingSetup, values]);

  const tripResult = useMemo(() => {
    const energy = sessions.reduce((sum, session) => sum + session.energyKwh, 0);
    const cost = sessions.reduce((sum, session) => sum + session.energyKwh * session.unitPrice, 0);
    const fuelLiters = tripDistance / 100 * values.fuelConsumption;
    const fuelCost = fuelLiters * values.fuelPrice;
    return {
      energy,
      cost,
      averagePrice: energy ? cost / energy : 0,
      costPerKm: tripDistance ? cost / tripDistance : 0,
      efficiency: energy ? tripDistance / energy : 0,
      fuelCost,
      savings: fuelCost - cost,
    };
  }, [sessions, tripDistance, values.fuelConsumption, values.fuelPrice]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2200); }
  function update(key: keyof Values, value: string) { setValues((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) })); }
  function openMode(nextMode: CalculatorMode) { setMode(nextMode); window.setTimeout(() => document.getElementById("hesapla")?.scrollIntoView({ behavior: "smooth" }), 0); }
  function addSession() { setSessions((current) => [...current, { id: crypto.randomUUID(), tariffId: null, provider: "Diğer istasyon", energyKwh: 0, unitPrice: 0, setup: "public-dc" }]); }
  function updateSession(id: string, patch: Partial<ChargeSession>) { setSessions((current) => current.map((session) => session.id === id ? { ...session, ...patch } : session)); }
  function removeSession(id: string) { setSessions((current) => current.length === 1 ? current : current.filter((session) => session.id !== id)); }

  async function share() {
    const text = `VoltHesap sonucu: ${values.distance} km için tahmini maliyet ${format.format(result.cost)} ₺.`;
    try {
      if (navigator.share) await navigator.share({ title: "VoltHesap sonucum", text, url: location.href });
      else { await navigator.clipboard.writeText(`${text} ${location.href}`); notify("Sonuç bağlantısı kopyalandı"); }
    } catch (error) { if (error instanceof Error && error.name !== "AbortError") notify("Paylaşım açılamadı"); }
  }

  async function readPdf(file: File) {
    if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) { notify("10 MB altında bir PDF seç"); return; }
    setFileName(file.name); setPdfMessage("Belge cihazında okunuyor…"); setInvoice(null);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      let text = "";
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber), content = await page.getTextContent();
        text += ` ${content.items.map((item) => "str" in item ? item.str : "").join(" ")}`;
      }
      setPdfMessage(`${pdf.numPages} sayfa okundu`);
      const found = extractInvoice(text); setInvoice(found); notify(found ? "Fatura değerleri bulundu" : "Tüketim ve toplam tutar birlikte bulunamadı");
    } catch { setPdfMessage("Metin otomatik okunamadı; aşağıya yapıştırabilirsin."); }
  }

  function analyzeManual() { const found = extractInvoice(manualText); setInvoice(found); notify(found ? "Fatura değerleri bulundu" : "Tüketim ve toplam tutar birlikte bulunamadı"); }

  return <>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="VoltHesap ana sayfa"><span className="brand-mark">V</span><span>VoltHesap</span></a>
      <nav aria-label="Ana menü"><button type="button" onClick={() => openMode("trip")}>Yol hesabı</button><button type="button" onClick={() => openMode("budget")}>Şarj bütçesi</button><button type="button" onClick={() => openMode("home")}>Ev &amp; fatura</button></nav>
      <Link className="pill" href="/auth/login">Giriş yap <span>↗</span></Link>
    </header>

    <main id="top">
      <section className="hero">
        <div className="eyebrow"><span /> Türkiye&apos;nin elektrikli araç maliyet asistanı</div>
        <h1>Her hesap,<br /><em>kendi yolunda.</em></h1>
        <p>Geçmiş bir yolculuğun gerçek maliyetini çıkar, şarj alışkanlığının gelecek aylara etkisini gör veya ev faturanı ayrı bir akışta analiz et.</p>
        <div className="hero-actions"><button className="button primary" type="button" onClick={() => openMode("trip")}>Yolumu hesapla <span>↓</span></button><button className="button ghost" type="button" onClick={() => openMode("budget")}>Bütçemi öngör</button></div>
        <div className="ticker" aria-label="Örnek hesaplama"><span>ÖRNEK</span><strong>240 km</strong><i>·</i><strong>2 şarj</strong><i>·</i><b>342,50 ₺</b></div>
      </section>

      <section className="calculator-wrap" id="hesapla">
        <div className="tool-intro"><span className="kicker">HESAPLAMA MERKEZİ</span><h2>Ne öğrenmek istiyorsun?</h2><p>Her senaryo kendi sorularını sorar. Böylece yolculuk, alışkanlık ve ev faturası birbirine karışmaz.</p></div>
        <div className="mode-switch" role="tablist" aria-label="Hesap türü">
          <ModeButton active={mode === "trip"} number="01" title="Yol ne kadara geldi?" description="Gerçek şarj oturumlarını topla" onClick={() => setMode("trip")} />
          <ModeButton active={mode === "budget"} number="02" title="Şarj bütçem" description="1–12 aylık alışkanlık tahmini" onClick={() => setMode("budget")} />
          <ModeButton active={mode === "home"} number="03" title="Evde şarj & fatura" description="Faturadaki araç payını ayır" onClick={() => setMode("home")} />
        </div>

        {mode === "trip" && <TripCalculator
          tripName={tripName}
          tripDistance={tripDistance}
          sessions={sessions}
          chargingTariffs={chargingTariffs}
          result={tripResult}
          fuelType={fuelType}
          fuelConsumption={values.fuelConsumption}
          fuelPrice={values.fuelPrice}
          onTripName={setTripName}
          onTripDistance={setTripDistance}
          onFuelType={setFuelType}
          onFuelConsumption={(value) => update("fuelConsumption", value)}
          onFuelPrice={(value) => update("fuelPrice", value)}
          onAddSession={addSession}
          onUpdateSession={updateSession}
          onRemoveSession={removeSession}
        />}

        {mode === "budget" && <>
        <div className="section-head scenario-heading"><div><span className="kicker">02 / ALIŞKANLIK</span><h2>Şarj bütçem</h2></div><p>Günlük kullanımını geleceğe taşı. Sonucu 1, 3, 6 ay ve 1 yıl için ayrı ayrı gör.</p></div>
        <div className="calculator">
          <div className="form-panel">
            <NumberField label="Mesafe" help="Şimdi maliyetini görmek istediğin yol uzunluğu." unit="km" value={values.distance} onChange={(v) => update("distance", v)} />
            <NumberField label="Rutin yıllık mesafe" help="İşe gidiş ve günlük kullanım gibi uzun yol dışındaki yıllık sürüşün." unit="km / yıl" value={values.annualDistance} onChange={(v) => update("annualDistance", v)} />
            <NumberField label="Ayda kaç uzun yol?" help="Şehir dışı veya günlük rutinin dışındaki ortalama yolculuk sayısı." unit="kez / ay" value={values.longTripsPerMonth} onChange={(v) => update("longTripsPerMonth", v)} />
            <NumberField label="Ortalama uzun yol" help="Bir uzun yolculuğun gidiş-dönüş toplam mesafesi." unit="km" value={values.averageLongTripDistance} onChange={(v) => update("averageLongTripDistance", v)} />
            <NumberField label="Kullanılabilir batarya" help="Aracın gerçekten kullanabildiği batarya kapasitesi. Araç seçildiğinde otomatik gelecek." unit="kWh" value={values.batteryCapacity} step="0.1" onChange={(v) => update("batteryCapacity", v)} />
            <NumberField label="Ortalama tüketim" help="Aracın 100 km'de bataryadan harcadığı enerji. Araç seçildiğinde katalog değeriyle başlayacağız." unit="kWh / 100 km" value={values.consumption} step="0.1" onChange={(v) => update("consumption", v)} />
            <NumberField label="Ev elektriği fiyatı" help="Faturandaki toplam tutarın toplam kWh'ye bölünmüş efektif değeri. PDF okuyucu bunu otomatik bulacak." unit="₺ / kWh" value={values.electricity} step="0.01" onChange={(v) => update("electricity", v)} />
            <NumberField label="Halka açık şarj fiyatı" help="Ev dışında kullandığın istasyonun kWh fiyatı. Evde şarj oranı %100 ise sonucu etkilemez." unit="₺ / kWh" value={values.publicElectricity} step="0.01" onChange={(v) => update("publicElectricity", v)} />

            <details open>
              <summary>Şarj alışkanlığın</summary>
              <div className="details-grid">
                <SelectField label="Genelde nasıl şarj ediyorsun?" help="Teknik güç değerini bilmen gerekmiyor. Bu seçimden tipik enerji kaybını tahmin ediyoruz." value={chargingSetup} onChange={(value) => setChargingSetup(value as ChargingSetup)} options={[{ value: "outlet", label: "Ev prizi" }, { value: "wallbox", label: "Ev tipi wallbox" }, { value: "public-ac", label: "Halka açık AC" }, { value: "public-dc", label: "Hızlı DC" }]} />
                <NumberField label="Ayda kaç kez şarj ediyorsun?" help="Tam dolum olması gerekmiyor; kabloyu takıp enerji aldığın ortalama seans sayısı." unit="kez" value={values.chargesPerMonth} onChange={(v) => update("chargesPerMonth", v)} />
                <SelectField label="Eklediğin enerjiyi nasıl biliyorsun?" help="Yüzdeleri biliyorsan batarya kapasitesinden, kWh'yi biliyorsan doğrudan hesaplarız." value={chargeInputMode} onChange={(value) => setChargeInputMode(value as ChargeInputMode)} options={[{ value: "percentage", label: "Yüzde olarak" }, { value: "energy", label: "kWh olarak" }]} />
                {chargeInputMode === "percentage" ? <>
                  <NumberField label="Genelde yüzde kaçta takıyorsun?" help="Şarja başladığındaki yaklaşık batarya yüzdesi." unit="%" value={values.startChargePercent} onChange={(v) => update("startChargePercent", v)} max={100} />
                  <NumberField label="Yüzde kaçta çıkarıyorsun?" help="Şarjı bitirdiğindeki yaklaşık batarya yüzdesi." unit="%" value={values.endChargePercent} onChange={(v) => update("endChargePercent", v)} max={100} />
                </> : <NumberField label="Bir şarjda eklenen enerji" help="Araç veya istasyon uygulamasında gördüğün ortalama enerji." unit="kWh" value={values.knownKwhPerCharge} step="0.1" onChange={(v) => update("knownKwhPerCharge", v)} />}
                <NumberField label="Şarjın ne kadarı evde?" help="Toplam şarj enerjisinin yaklaşık ne kadarını ev elektriğinden aldığın." unit="%" value={values.homeChargingPercent} onChange={(v) => update("homeChargingPercent", v)} max={100} />
              </div>
              <p className="estimate-note">Seçimine göre tahmini şarj kaybı: <b>%{format.format(result.lossRate * 100)}</b>. Teknik şarj cihazı bilgisi gerekmiyor.</p>
            </details>

            <details>
              <summary>Evdeki şarj hızını ayrıntılandır</summary>
              <div className="details-grid">
                <NumberField label="Akım" help="Şarj sırasında kullanılan amper. Bilmiyorsan şarj cihazı veya araç ekranına bakabilirsin." unit="A" value={values.homeAmps} onChange={(v) => update("homeAmps", v)} />
                <NumberField label="Gerilim" help="Türkiye'deki tek faz ev bağlantısında çoğunlukla yaklaşık 230 V kullanılır." unit="V" value={values.homeVoltage} onChange={(v) => update("homeVoltage", v)} />
                <SelectField label="Faz" help="Ev bağlantının tek faz mı, üç faz mı olduğu." value={String(values.homePhases)} onChange={(v) => update("homePhases", v)} options={[{ value: "1", label: "Tek faz" }, { value: "3", label: "Üç faz" }]} />
                <NumberField label="Araçta görülen güç" help="Gerçek kW değerini biliyorsan gir. 0 bırakırsan amper × volt × faz ile tahmin ederiz." unit="kW" value={values.chargerPower} step="0.1" onChange={(v) => update("chargerPower", v)} />
              </div>
              <p className="estimate-note">Hesaplanan ev gücü: <b>{format.format(result.effectiveHomePower)} kW</b> · Aylık yaklaşık <b>{format.format(result.monthlyHomeHours)} saat</b> şarja bağlı.</p>
            </details>

            <details>
              <summary>{fuelType === "diesel" ? "Dizel" : "Benzinli"} araçla karşılaştır</summary>
              <div className="details-grid">
                <SelectField label="Karşılaştırma yakıtı" help="Aynı kilometreyi hangi araç tipiyle kıyaslamak istediğin." value={fuelType} onChange={(value) => setFuelType(value as FuelType)} options={[{ value: "gasoline", label: "Benzin" }, { value: "diesel", label: "Dizel" }]} />
                <NumberField label={`${fuelType === "diesel" ? "Dizel" : "Benzin"} tüketimi`} help="Karşılaştırdığın aracın 100 km'deki ortalama yakıt tüketimi." unit="L / 100 km" value={values.fuelConsumption} step="0.1" onChange={(v) => update("fuelConsumption", v)} />
                <NumberField label={`${fuelType === "diesel" ? "Motorin" : "Benzin"} fiyatı`} help="Pompadaki güncel litre fiyatı." unit="₺ / L" value={values.fuelPrice} step="0.01" onChange={(v) => update("fuelPrice", v)} />
              </div>
            </details>

            <p className="hint">Hesaplama, araç seçimi ve fatura analizi ücretsiz ve girişsiz çalışır. Yalnızca geçmişini kaydetmek istersen giriş gerekir.</p>
          </div>
          <aside className="result-panel" aria-live="polite">
            <span className="result-label">ALIŞKANLIĞININ MALİYETİ <HelpTip text="Yıllık kilometre ve şarj alışkanlığının seçilen döneme düşen tahmini toplamı." /></span>
            <div className="period-switch">{[1, 3, 6, 12].map((months) => <button type="button" key={months} className={projectionMonths === months ? "active" : ""} onClick={() => setProjectionMonths(months)}>{months === 12 ? "1 yıl" : `${months} ay`}</button>)}</div>
            <div className="projection-card"><span>{projectionMonths === 12 ? "1 yıllık" : `${projectionMonths} aylık`} tahmini şarj</span><b>{format.format(result.annualEvCost / 12 * projectionMonths)} ₺</b><small>{format.format(result.totalAnnualDistance / 12 * projectionMonths)} km kullanım</small></div>
            <div className="big-number"><strong>{format.format(result.cost)}</strong><span>₺</span></div>
            <p>{format.format(values.distance).replace(",00", "")} km yol için, tahmini şarj kaybı dahil</p>
            <div className="result-grid">
              <Metric label="Bataryaya giden" help="Aracın sürüş için bataryadan harcayacağı tahmini enerji." value={`${format.format(result.batteryEnergy)} kWh`} />
              <Metric label="Şebekeden çekilen" help="Şarj dönüşüm kayıpları dahil priz veya istasyondan alınan enerji." value={`${format.format(result.energy)} kWh`} />
              <Metric label="Aylık şarj maliyeti" help="Şarj sıklığın ve evde şarj oranın kullanılarak hesaplanan ev + istasyon toplamı." value={`${format.format(result.monthlyChargingCost)} ₺`} />
              <Metric label="Evde şarj gücü" help="Girdiğin gerçek güç veya amper × volt × faz hesabı." value={`${format.format(result.effectiveHomePower)} kW`} />
              <Metric label="Evde şarj süresi" help="Seçtiğin dönem için evden alınan enerjinin şarj gücüne bölümü." value={`${format.format(result.monthlyHomeHours * projectionMonths)} saat`} />
              <Metric label="Yıllık elektrik maliyeti" help="Yıllık mesafe, tüketim, kayıp ve ev/istasyon fiyat karışımına göre." value={`${format.format(result.annualEvCost)} ₺`} />
              <Metric label="Yıllık yakıt maliyeti" help={`Aynı yıllık mesafenin seçtiğin ${fuelType === "diesel" ? "dizel" : "benzinli"} araçla tahmini maliyeti.`} value={`${format.format(result.annualFuelCost)} ₺`} />
              <Metric label="Yıllık tahmini tasarruf" help="Yakıt maliyetinden elektrik maliyeti çıkarılmıştır; bakım, sigorta ve satın alma fiyatı dahil değildir." value={`${result.annualSavings < 0 ? "−" : ""}${format.format(Math.abs(result.annualSavings))} ₺`} />
              <Metric label="Başa baş elektrik fiyatı" help="Elektrik fiyatı bu seviyeye geldiğinde seçilen yakıtlı araçla enerji maliyetleri eşitlenir." value={`${format.format(result.breakEvenElectricityPrice)} ₺/kWh`} />
            </div>
            <div className="bar"><span style={{ width: `${result.fuel ? Math.min(100, Math.max(3, result.cost / result.fuel * 100)) : 50}%` }} /></div>
            <div className="bar-labels"><span>Elektrikli</span><span>%{Math.abs(result.percentage)} {result.difference >= 0 ? "daha düşük" : "daha yüksek"}</span><span>{fuelType === "diesel" ? "Dizel" : "Benzinli"}</span></div>
            <button className="share" type="button" onClick={share}>Sonucu paylaş <span>↗</span></button>
          </aside>
        </div>
        </>}
      </section>

      {mode === "home" && <section className="invoice" id="fatura">
        <div className="invoice-copy"><span className="kicker">03 / EVDE ŞARJ &amp; FATURA</span><h2>Faturanın ne kadarı<br /><em>araba?</em></h2><p>Fatura burada anlam kazanır: birim fiyatı bulur, evde şarj tahmininle eşleştirir ve araç olmasaydı yaklaşık ne ödeyeceğini gösterir.</p><div className="home-fields"><NumberField light label="Aylık elektrik faturası" help="Araç şarjı dahil ödediğin toplam." unit="₺" value={values.monthlyElectricityBill} onChange={(v) => update("monthlyElectricityBill", v)} /><NumberField light label="Efektif elektrik fiyatı" help="Toplam fatura / toplam tüketim. PDF okuyucu bunu otomatik bulabilir." unit="₺/kWh" step="0.01" value={values.electricity} onChange={(v) => update("electricity", v)} /><NumberField light label="Ayda kaç ev şarjı?" help="Kabloyu takıp enerji aldığın ortalama oturum sayısı." unit="kez" value={values.chargesPerMonth} onChange={(v) => update("chargesPerMonth", v)} /><NumberField light label="Batarya kapasitesi" help="Aracın kullanılabilir batarya kapasitesi." unit="kWh" step="0.1" value={values.batteryCapacity} onChange={(v) => update("batteryCapacity", v)} /><NumberField light label="Başlangıç şarjı" help="Evde şarja taktığındaki ortalama batarya yüzdesi." unit="%" max={100} value={values.startChargePercent} onChange={(v) => update("startChargePercent", v)} /><NumberField light label="Bitiş şarjı" help="Evde şarjı bitirdiğindeki ortalama batarya yüzdesi." unit="%" max={100} value={values.endChargePercent} onChange={(v) => update("endChargePercent", v)} /><NumberField light label="Şarjın ne kadarı evde?" help="Toplam şarj enerjisinin evden alınan yaklaşık oranı." unit="%" max={100} value={values.homeChargingPercent} onChange={(v) => update("homeChargingPercent", v)} /><NumberField light label="Vergi ve fon etkisi" help="Bilmiyorsan 0 bırak; fatura ayrıntıları geldiğinde otomatikleştirilecek." unit="%" value={values.taxAndFundPercent} onChange={(v) => update("taxAndFundPercent", v)} /></div><div className="home-metrics"><Metric label="Aracın fatura payı" help="Evde şarj maliyetinin toplam faturaya oranı." value={`%${format.format(result.electricityBillShare)}`} /><Metric label="Araç olmasaydı" help="Toplam faturadan tahmini evde şarj tutarı çıkarılır." value={`${format.format(result.electricityBillBeforeEv)} ₺`} /><Metric label="Evde şarj" help="Aylık ev şarjlarının toplam tahmini maliyeti." value={`${format.format(result.monthlyHomeChargingCost)} ₺`} /><Metric label="Tahmini vergi/fon" help="Girdiğin oran üzerinden evde şarj payına düşen yaklaşık tutar." value={`${format.format(result.monthlyHomeTax)} ₺`} /></div><div className="privacy"><span>✓</span><div><b>Yerel ve gizli</b><small>PDF yalnızca bu tarayıcıda işlenir.</small></div></div></div>
        <div className="upload-card">
          {!fileName && <label className={`dropzone${dragging ? " drag" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) readPdf(file); }}><input type="file" accept="application/pdf" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && readPdf(e.target.files[0])} /><span className="upload-icon">↥</span><b>PDF faturanı buraya bırak</b><small>veya dosya seçmek için tıkla · Maks. 10 MB</small></label>}
          {fileName && <div className="pdf-status"><div><span>{fileName}</span><small>{pdfMessage}</small></div><button onClick={() => { setFileName(""); setInvoice(null); }} aria-label="Dosyayı kaldır">×</button></div>}
          {invoice && <div className="invoice-result"><div><span>Bulunan tüketim</span><b>{format.format(invoice.kwh)} kWh</b></div><div><span>Bulunan tutar</span><b>{format.format(invoice.total)} ₺</b></div><div className="accent"><span>Efektif birim fiyat</span><b>{format.format(invoice.rate)} ₺/kWh</b><small>Okuma güveni %{Math.round(invoice.confidence * 100)}</small></div>{invoice.lineItems.length > 0 && <div className="invoice-breakdown"><strong>Bulunan fatura kalemleri</strong>{invoice.lineItems.map((item) => <p key={`${item.category}-${item.label}`}><span>{item.label}{item.quantity !== undefined && item.unitPrice !== undefined && <small>{format.format(item.quantity)} {item.unit} × {format.format(item.unitPrice)} ₺/{item.unit}</small>}{item.taxRatePercent !== undefined && <small>%{format.format(item.taxRatePercent)} oran</small>}</span><b>{format.format(item.amount)} ₺</b></p>)}</div>}<button type="button" onClick={() => { setValues((v) => ({ ...v, electricity: Number(invoice.rate.toFixed(2)) })); location.hash = "hesapla"; notify("Birim fiyat hesaba uygulandı"); }}>Bu fiyatla hesapla</button></div>}
          <details className="manual"><summary>PDF okunmadı mı? Metni yapıştır</summary><textarea rows={4} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Faturadaki tüketim ve toplam tutarın geçtiği bölümü buraya yapıştır…" /><button type="button" onClick={analyzeManual}>Metni analiz et</button></details>
        </div>
      </section>}

      <section className="guide" id="rehber"><div className="section-head"><div><span className="kicker">03 / İPUÇLARI</span><h2>Daha gerçekçi sonuç için</h2></div></div><div className="guide-grid"><article><span>01</span><h3>Göstergeyi referans al</h3><p>Son 500–1.000 km ortalama tüketimin, katalog verisinden daha gerçekçi sonuç verir.</p></article><article><span>02</span><h3>Şarj kaybını unutma</h3><p>Ev tipi AC şarjda kablo, dönüştürücü ve batarya nedeniyle genellikle ek enerji çekilir.</p></article><article><span>03</span><h3>Tarifeni kontrol et</h3><p>Faturandaki toplam bedel ve kWh değerinden efektif birim fiyatını hesaplayabilirsin.</p></article></div></section>
    </main>
    <footer><div className="brand"><span className="brand-mark">V</span><span>VoltHesap</span></div><p>Elektrikli yolculuğun sade hesabı.</p><span>Sonuçlar tahminidir · © 2026</span></footer>
    <div className={`toast${toast ? " show" : ""}`} role="status">{toast}</div>
  </>;
}

function ModeButton({ active, number, title, description, onClick }: { active: boolean; number: string; title: string; description: string; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={onClick}><span>{number}</span><b>{title}</b><small>{description}</small></button>;
}

function TripCalculator({ tripName, tripDistance, sessions, chargingTariffs, result, fuelType, fuelConsumption, fuelPrice, onTripName, onTripDistance, onFuelType, onFuelConsumption, onFuelPrice, onAddSession, onUpdateSession, onRemoveSession }: {
  tripName: string;
  tripDistance: number;
  sessions: ChargeSession[];
  chargingTariffs: ChargingTariffOption[];
  result: { energy: number; cost: number; averagePrice: number; costPerKm: number; efficiency: number; fuelCost: number; savings: number };
  fuelType: FuelType;
  fuelConsumption: number;
  fuelPrice: number;
  onTripName: (value: string) => void;
  onTripDistance: (value: number) => void;
  onFuelType: (value: FuelType) => void;
  onFuelConsumption: (value: string) => void;
  onFuelPrice: (value: string) => void;
  onAddSession: () => void;
  onUpdateSession: (id: string, patch: Partial<ChargeSession>) => void;
  onRemoveSession: (id: string) => void;
}) {
  return <div className="scenario-panel">
    <div className="section-head scenario-heading"><div><span className="kicker">01 / GERÇEK YOLCULUK</span><h2>Yol ne kadara geldi?</h2></div><p>Her şarjı ayrı ekle. Trugo&apos;dan 20 kWh, sonra Astor&apos;dan 15 kWh aldıysan ikisini de aynı yolculukta toplarız.</p></div>
    <div className="trip-layout">
      <div className="session-builder">
        <div className="trip-basics">
          <TextField label="Yolculuk adı" help="Geçmişine kaydettiğinde kolayca bulabileceğin kısa ad." value={tripName} onChange={onTripName} />
          <NumberField light label="Toplam yol" help="Bu şarj oturumlarıyla katettiğin toplam mesafe." unit="km" value={tripDistance} onChange={(value) => onTripDistance(Math.max(0, Number(value) || 0))} />
        </div>
        <div className="session-title"><div><b>Şarj oturumları</b><small>{sessions.length} oturum · taslak bu cihazda saklanır</small></div><button type="button" onClick={onAddSession}>+ Oturum ekle</button></div>
        <div className="session-list">{sessions.map((session, index) => <div className="session-row" key={session.id}>
          <span className="session-index">{String(index + 1).padStart(2, "0")}</span>
          <label><span>İstasyon / tarife</span><select value={session.tariffId ?? "custom"} onChange={(event) => { const tariff = chargingTariffs.find((item) => item.id === event.target.value); if (!tariff) { onUpdateSession(session.id, { tariffId: null }); return; } onUpdateSession(session.id, { tariffId: tariff.id, provider: tariff.network, unitPrice: tariff.priceMax, setup: tariff.connectorType === "AC" ? "public-ac" : "public-dc" }); }}><option value="custom">Diğer / manuel</option>{chargingTariffs.map((tariff) => <option key={tariff.id} value={tariff.id}>{formatTariffLabel(tariff)}</option>)}</select>{!session.tariffId && <input aria-label="İstasyon adı" value={session.provider} onChange={(event) => onUpdateSession(session.id, { provider: event.target.value })} />}</label>
          <label><span>Şarj türü</span><select value={session.setup} onChange={(event) => onUpdateSession(session.id, { setup: event.target.value as ChargingSetup })}><option value="public-dc">Hızlı DC</option><option value="public-ac">Halka açık AC</option><option value="wallbox">Ev wallbox</option><option value="outlet">Ev prizi</option></select></label>
          <label><span>Alınan enerji</span><div><input type="number" min="0" step="0.1" value={session.energyKwh} onChange={(event) => onUpdateSession(session.id, { energyKwh: Math.max(0, Number(event.target.value) || 0) })} /><small>kWh</small></div></label>
          <label><span>Birim fiyat</span><div><input type="number" min="0" step="0.01" value={session.unitPrice} onChange={(event) => onUpdateSession(session.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })} /><small>₺/kWh</small></div></label>
          <b className="session-total">{format.format(session.energyKwh * session.unitPrice)} ₺</b>
          <button className="remove-session" type="button" aria-label={`${session.provider} oturumunu kaldır`} onClick={() => onRemoveSession(session.id)}>×</button>
        </div>)}</div>
        <details className="trip-compare"><summary>{fuelType === "diesel" ? "Dizel" : "Benzinli"} araçla karşılaştır</summary><div className="trip-basics three"><SelectField light label="Yakıt türü" help="Aynı yolun hangi araçla karşılaştırılacağı." value={fuelType} onChange={(value) => onFuelType(value as FuelType)} options={[{ value: "gasoline", label: "Benzin" }, { value: "diesel", label: "Dizel" }]} /><NumberField light label="Yakıt tüketimi" help="Karşılaştırma aracının ortalaması." unit="L/100 km" step="0.1" value={fuelConsumption} onChange={onFuelConsumption} /><NumberField light label="Yakıt fiyatı" help="Güncel litre fiyatı." unit="₺/L" step="0.01" value={fuelPrice} onChange={onFuelPrice} /></div></details>
      </div>
      <aside className="trip-receipt" aria-live="polite"><span className="result-label">YOLCULUK TOPLAMI</span><div className="big-number"><strong>{format.format(result.cost)}</strong><span>₺</span></div><p>{format.format(tripDistance).replace(",00", "")} km · {sessions.length} şarj oturumu</p><div className="receipt-lines"><Metric label="Toplam enerji" help="Bütün şarj oturumlarının toplamı." value={`${format.format(result.energy)} kWh`} /><Metric label="Ortalama fiyat" help="Toplam tutar / toplam enerji." value={`${format.format(result.averagePrice)} ₺/kWh`} /><Metric label="Kilometre maliyeti" help="Toplam tutar / yol mesafesi." value={`${format.format(result.costPerKm)} ₺/km`} /><Metric label="Gerçekleşen verim" help="Yol / alınan enerji. Başlangıç ve bitiş batarya farkı dahil değildir." value={`${format.format(result.efficiency)} km/kWh`} /></div><div className="fuel-comparison"><span>{fuelType === "diesel" ? "Dizel" : "Benzinli"} tahmini</span><b>{format.format(result.fuelCost)} ₺</b><small>{result.savings >= 0 ? `${format.format(result.savings)} ₺ daha az harcadın` : `${format.format(Math.abs(result.savings))} ₺ daha fazla harcadın`}</small></div></aside>
    </div>
  </div>;
}

function HelpTip({ text }: { text: string }) {
  return <span className="help-tip"><button type="button" aria-label="Açıklamayı göster">?</button><span role="tooltip">{text}</span></span>;
}

function NumberField({ label, help, unit, value, step = "1", max, light = false, onChange }: { label: string; help: string; unit: string; value: number; step?: string; max?: number; light?: boolean; onChange: (value: string) => void }) {
  return <label className={light ? "light-field" : ""}><span className="field-title">{label} <HelpTip text={help} /></span><span className="field-unit">{unit}</span><input type="number" min="0" max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextField({ label, help, value, onChange }: { label: string; help: string; value: string; onChange: (value: string) => void }) {
  return <label className="light-field"><span className="field-title">{label} <HelpTip text={help} /></span><input type="text" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, help, value, options, light = false, onChange }: { label: string; help: string; value: string; options: { value: string; label: string }[]; light?: boolean; onChange: (value: string) => void }) {
  return <label className={light ? "light-field" : ""}><span className="field-title">{label} <HelpTip text={help} /></span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Metric({ label, help, value }: { label: string; help: string; value: string }) {
  return <div><span>{label} <HelpTip text={help} /></span><b>{value}</b></div>;
}
