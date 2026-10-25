"use client";

import { extractInvoice, type InvoiceResult } from "@/lib/invoice-parser";
import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type Values = {
  distance: number;
  annualDistance: number;
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
  fuelConsumption: number;
  fuelPrice: number;
};

type ChargingSetup = "outlet" | "wallbox" | "public-ac" | "public-dc";
type ChargeInputMode = "percentage" | "energy";
type FuelType = "gasoline" | "diesel";

const defaults: Values = {
  distance: 100,
  annualDistance: 15000,
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
  const [values, setValues] = useState<Values>(defaults);
  const [chargingSetup, setChargingSetup] = useState<ChargingSetup>("wallbox");
  const [chargeInputMode, setChargeInputMode] = useState<ChargeInputMode>("percentage");
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pdfMessage, setPdfMessage] = useState("");
  const [invoice, setInvoice] = useState<InvoiceResult | null>(null);
  const [manualText, setManualText] = useState("");

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
    const annualEnergy = values.annualDistance / 100 * values.consumption * lossMultiplier;
    const annualEvCost = annualEnergy * weightedElectricityPrice;
    const annualFuelCost = values.annualDistance / 100 * values.fuelConsumption * values.fuelPrice;
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
      fullChargeCost: fullChargeEnergy * weightedElectricityPrice,
      estimatedRange: values.consumption ? values.batteryCapacity / values.consumption * 100 : 0,
      breakEvenElectricityPrice: energy ? fuel / energy : 0,
      batteryEnergyPerCharge,
      monthlyGridEnergy,
      monthlyHomeChargingCost,
      monthlyPublicChargingCost,
      monthlyChargingCost,
      monthlyHomeCostBeforeTax,
      monthlyHomeTax,
      electricityBillBeforeEv,
      electricityBillShare,
      electricityCoverage,
      waterCoverage,
      heatingCoverage,
    };
  }, [chargeInputMode, chargingSetup, values]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2200); }
  function update(key: keyof Values, value: string) { setValues((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) })); }

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
      <nav aria-label="Ana menü"><a href="#hesapla">Hesapla</a><a href="#fatura">Fatura oku</a><a href="#rehber">Nasıl çalışır?</a></nav>
      <Link className="pill" href="/auth/login">Giriş yap <span>↗</span></Link>
    </header>

    <main id="top">
      <section className="hero">
        <div className="eyebrow"><span /> Türkiye&apos;nin elektrikli araç hesap makinesi</div>
        <h1>Şarjdan önce<br /><em>hesabını bil.</em></h1>
        <p>Aracının gerçek tüketimini, evde şarj maliyetini ve benzinliye göre farkını tek ekranda gör. Üyelik olmadan hesapla; istersen sonuçlarını hesabına kaydet.</p>
        <div className="hero-actions"><a className="button primary" href="#hesapla">Hemen hesapla <span>↓</span></a><a className="button ghost" href="#fatura">PDF faturanı okut</a></div>
        <div className="ticker" aria-label="Örnek hesaplama"><span>ÖRNEK</span><strong>100 km</strong><i>×</i><strong>17,5 kWh</strong><i>×</i><strong>3,00 ₺</strong><i>=</i><b>52,50 ₺</b></div>
      </section>

      <section className="calculator-wrap" id="hesapla">
        <div className="section-head"><div><span className="kicker">01 / MALİYET</span><h2>Yol ne kadara geliyor?</h2></div><p>Değerleri kendi aracına ve tarifene göre değiştir. Sonuç anında güncellenir.</p></div>
        <div className="calculator">
          <div className="form-panel">
            <NumberField label="Mesafe" help="Şimdi maliyetini görmek istediğin yol uzunluğu." unit="km" value={values.distance} onChange={(v) => update("distance", v)} />
            <NumberField label="Yıllık mesafe" help="Yıllık yakıt ve elektrik karşılaştırması için tahmini toplam sürüşün." unit="km / yıl" value={values.annualDistance} onChange={(v) => update("annualDistance", v)} />
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
              <summary>{fuelType === "diesel" ? "Dizel" : "Benzinli"} araçla karşılaştır</summary>
              <div className="details-grid">
                <SelectField label="Karşılaştırma yakıtı" help="Aynı kilometreyi hangi araç tipiyle kıyaslamak istediğin." value={fuelType} onChange={(value) => setFuelType(value as FuelType)} options={[{ value: "gasoline", label: "Benzin" }, { value: "diesel", label: "Dizel" }]} />
                <NumberField label={`${fuelType === "diesel" ? "Dizel" : "Benzin"} tüketimi`} help="Karşılaştırdığın aracın 100 km'deki ortalama yakıt tüketimi." unit="L / 100 km" value={values.fuelConsumption} step="0.1" onChange={(v) => update("fuelConsumption", v)} />
                <NumberField label={`${fuelType === "diesel" ? "Motorin" : "Benzin"} fiyatı`} help="Pompadaki güncel litre fiyatı." unit="₺ / L" value={values.fuelPrice} step="0.01" onChange={(v) => update("fuelPrice", v)} />
              </div>
            </details>

            <details>
              <summary>Ev faturaları ve vergiler</summary>
              <div className="details-grid">
                <NumberField label="Mevcut elektrik faturası" help="Araç şarjı dahil ödediğin aylık toplam. Aracın fatura payını buradan ayırıyoruz." unit="₺ / ay" value={values.monthlyElectricityBill} onChange={(v) => update("monthlyElectricityBill", v)} />
                <NumberField label="Vergi ve fonların toplam etkisi" help="Resmî tarife veya fatura kırılımı seçilene kadar isteğe bağlı yaklaşık oran. Bilmiyorsan 0 bırak." unit="%" value={values.taxAndFundPercent} step="0.1" onChange={(v) => update("taxAndFundPercent", v)} />
                <NumberField label="Su faturası" help="EV tasarrufunun yıllık su giderini karşılayıp karşılamadığını göstermek için aylık ortalama." unit="₺ / ay" value={values.monthlyWaterBill} onChange={(v) => update("monthlyWaterBill", v)} />
                <NumberField label="Isınma gideri" help="Doğalgaz, merkezi sistem veya diğer ısınma için aylık ortalama." unit="₺ / ay" value={values.monthlyHeatingBill} onChange={(v) => update("monthlyHeatingBill", v)} />
              </div>
            </details>
            <p className="hint">Hesaplama, araç seçimi ve fatura analizi ücretsiz ve girişsiz çalışır. Yalnızca geçmişini kaydetmek istersen giriş gerekir.</p>
          </div>
          <aside className="result-panel" aria-live="polite">
            <span className="result-label">TAHMİNİ YOL MALİYETİ <HelpTip text="Seçtiğin mesafe için ev ve halka açık şarj oranı ile tahmini kayıp dahil toplam." /></span>
            <div className="big-number"><strong>{format.format(result.cost)}</strong><span>₺</span></div>
            <p>{format.format(values.distance).replace(",00", "")} km yol için, tahmini şarj kaybı dahil</p>
            <div className="result-grid">
              <Metric label="Bataryaya giden" help="Aracın sürüş için bataryadan harcayacağı tahmini enerji." value={`${format.format(result.batteryEnergy)} kWh`} />
              <Metric label="Şebekeden çekilen" help="Şarj dönüşüm kayıpları dahil priz veya istasyondan alınan enerji." value={`${format.format(result.energy)} kWh`} />
              <Metric label="Aylık şarj maliyeti" help="Şarj sıklığın ve evde şarj oranın kullanılarak hesaplanan ev + istasyon toplamı." value={`${format.format(result.monthlyChargingCost)} ₺`} />
              <Metric label="Elektrik faturasındaki araç payı" help="Evde şarj maliyetinin mevcut elektrik faturana oranı." value={`%${format.format(result.electricityBillShare)}`} />
              <Metric label="Vergisiz evde şarj tahmini" help="Girdiğin birleşik vergi ve fon oranı toplam evde şarj maliyetinden çıkarılarak hesaplanır." value={`${format.format(result.monthlyHomeCostBeforeTax)} ₺`} />
              <Metric label="Tahmini vergi ve fon" help="Yalnızca evde şarj kısmı için, senin girdiğin toplam oran üzerinden yaklaşık değer." value={`${format.format(result.monthlyHomeTax)} ₺`} />
              <Metric label="Araç hariç elektrik faturası" help="Mevcut faturadan tahmini evde şarj maliyeti çıkarılarak bulunan taban ev tüketimi." value={`${format.format(result.electricityBillBeforeEv)} ₺`} />
              <Metric label="Faturaya eklenen" help="Ay içindeki evde şarjların mevcut elektrik faturana eklediği tahmini tutar." value={`${format.format(result.monthlyHomeChargingCost)} ₺`} />
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
        <div className="life-impact">
          <div><span className="kicker">TASARRUFUN KARŞILIĞI</span><h3>Elektrikli araç, hangi faturaları görünmez kılıyor?</h3><p>Bu bir indirim veya ücretsiz hizmet iddiası değil; yakıttan kalan yıllık paranın diğer ev giderlerine denkliğini gösteren düşünsel bir karşılaştırma.</p></div>
          <Coverage label="Araç hariç elektrik" value={result.electricityCoverage} amount={result.electricityBillBeforeEv * 12} />
          <Coverage label="Su" value={result.waterCoverage} amount={values.monthlyWaterBill * 12} />
          <Coverage label="Isınma" value={result.heatingCoverage} amount={values.monthlyHeatingBill * 12} />
        </div>
      </section>

      <section className="invoice" id="fatura">
        <div className="invoice-copy"><span className="kicker">02 / FATURA OKUYUCU</span><h2>Faturayı bırak,<br /><em>birim fiyatı bulalım.</em></h2><p>Elektrik faturandaki tüketim ve toplam tutarı cihazında okuyup yaklaşık birim maliyeti çıkarır. Dosyan hiçbir sunucuya yüklenmez.</p><div className="privacy"><span>✓</span><div><b>Yerel ve gizli</b><small>PDF yalnızca bu tarayıcıda işlenir.</small></div></div></div>
        <div className="upload-card">
          {!fileName && <label className={`dropzone${dragging ? " drag" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) readPdf(file); }}><input type="file" accept="application/pdf" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && readPdf(e.target.files[0])} /><span className="upload-icon">↥</span><b>PDF faturanı buraya bırak</b><small>veya dosya seçmek için tıkla · Maks. 10 MB</small></label>}
          {fileName && <div className="pdf-status"><div><span>{fileName}</span><small>{pdfMessage}</small></div><button onClick={() => { setFileName(""); setInvoice(null); }} aria-label="Dosyayı kaldır">×</button></div>}
          {invoice && <div className="invoice-result"><div><span>Bulunan tüketim</span><b>{format.format(invoice.kwh)} kWh</b></div><div><span>Bulunan tutar</span><b>{format.format(invoice.total)} ₺</b></div><div className="accent"><span>Efektif birim fiyat</span><b>{format.format(invoice.rate)} ₺/kWh</b><small>Okuma güveni %{Math.round(invoice.confidence * 100)}</small></div>{invoice.lineItems.length > 0 && <div className="invoice-breakdown"><strong>Bulunan fatura kalemleri</strong>{invoice.lineItems.map((item) => <p key={`${item.category}-${item.label}`}><span>{item.label}</span><b>{format.format(item.amount)} ₺</b></p>)}</div>}<button type="button" onClick={() => { setValues((v) => ({ ...v, electricity: Number(invoice.rate.toFixed(2)) })); location.hash = "hesapla"; notify("Birim fiyat hesaba uygulandı"); }}>Bu fiyatla hesapla</button></div>}
          <details className="manual"><summary>PDF okunmadı mı? Metni yapıştır</summary><textarea rows={4} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Faturadaki tüketim ve toplam tutarın geçtiği bölümü buraya yapıştır…" /><button type="button" onClick={analyzeManual}>Metni analiz et</button></details>
        </div>
      </section>

      <section className="guide" id="rehber"><div className="section-head"><div><span className="kicker">03 / İPUÇLARI</span><h2>Daha gerçekçi sonuç için</h2></div></div><div className="guide-grid"><article><span>01</span><h3>Göstergeyi referans al</h3><p>Son 500–1.000 km ortalama tüketimin, katalog verisinden daha gerçekçi sonuç verir.</p></article><article><span>02</span><h3>Şarj kaybını unutma</h3><p>Ev tipi AC şarjda kablo, dönüştürücü ve batarya nedeniyle genellikle ek enerji çekilir.</p></article><article><span>03</span><h3>Tarifeni kontrol et</h3><p>Faturandaki toplam bedel ve kWh değerinden efektif birim fiyatını hesaplayabilirsin.</p></article></div></section>
    </main>
    <footer><div className="brand"><span className="brand-mark">V</span><span>VoltHesap</span></div><p>Elektrikli yolculuğun sade hesabı.</p><span>Sonuçlar tahminidir · © 2026</span></footer>
    <div className={`toast${toast ? " show" : ""}`} role="status">{toast}</div>
  </>;
}

function HelpTip({ text }: { text: string }) {
  return <span className="help-tip"><button type="button" aria-label="Açıklamayı göster">?</button><span role="tooltip">{text}</span></span>;
}

function NumberField({ label, help, unit, value, step = "1", max, onChange }: { label: string; help: string; unit: string; value: number; step?: string; max?: number; onChange: (value: string) => void }) {
  return <label><span className="field-title">{label} <HelpTip text={help} /></span><span className="field-unit">{unit}</span><input type="number" min="0" max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, help, value, options, onChange }: { label: string; help: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label><span className="field-title">{label} <HelpTip text={help} /></span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Metric({ label, help, value }: { label: string; help: string; value: string }) {
  return <div><span>{label} <HelpTip text={help} /></span><b>{value}</b></div>;
}

function Coverage({ label, value, amount }: { label: string; value: number; amount: number }) {
  return <div className="coverage-item"><div><span>{label}</span><b>%{format.format(value)}</b></div><div className="coverage-track"><span style={{ width: `${value}%` }} /></div><small>Yıllık {format.format(amount)} ₺ giderin tasarrufla karşılanan kısmı</small></div>;
}
