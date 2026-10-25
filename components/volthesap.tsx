"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type Values = { distance: number; consumption: number; electricity: number; loss: number; fuelConsumption: number; fuelPrice: number };
type InvoiceResult = { kwh: number; total: number; rate: number };

const defaults: Values = { distance: 100, consumption: 17.5, electricity: 3, loss: 10, fuelConsumption: 7, fuelPrice: 50 };
const format = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseNumber(value?: string) {
  if (!value) return null;
  let normalized = value.replace(/\s/g, "").replace(/₺|TL|TRY/gi, "");
  if (normalized.includes(",") && normalized.includes(".")) normalized = normalized.lastIndexOf(",") > normalized.lastIndexOf(".") ? normalized.replace(/\./g, "").replace(",", ".") : normalized.replace(/,/g, "");
  else if (normalized.includes(",")) normalized = normalized.replace(",", ".");
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function extractInvoice(text: string): InvoiceResult | null {
  const clean = text.replace(/\s+/g, " ");
  const kwhPatterns = [/(?:tüketim|toplam tüketim|enerji)[^\d]{0,35}([\d.,]+)\s*kWh/i, /([\d.,]+)\s*kWh/i];
  const totalPatterns = [/(?:ödenecek tutar|fatura tutarı|toplam tutar|genel toplam)[^\d]{0,25}([\d.,]+)\s*(?:TL|₺|TRY)/i, /(?:ödenecek tutar|fatura tutarı|genel toplam)[^\d]{0,25}([\d.,]+)/i];
  let kwh: number | null = null, total: number | null = null;
  for (const pattern of kwhPatterns) { const match = clean.match(pattern); if (match) { kwh = parseNumber(match[1]); break; } }
  for (const pattern of totalPatterns) { const match = clean.match(pattern); if (match) { total = parseNumber(match[1]); break; } }
  return kwh && total ? { kwh, total, rate: total / kwh } : null;
}

export function VoltHesap() {
  const [values, setValues] = useState<Values>(defaults);
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
    const energy = values.distance / 100 * values.consumption * (1 + Math.min(50, values.loss) / 100);
    const cost = energy * values.electricity;
    const fuel = values.distance / 100 * values.fuelConsumption * values.fuelPrice;
    const difference = fuel - cost;
    return { energy, cost, fuel, difference, percentage: fuel ? Math.round(difference / fuel * 100) : 0 };
  }, [values]);

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
            <NumberField label="Mesafe" unit="km" value={values.distance} onChange={(v) => update("distance", v)} />
            <NumberField label="Ortalama tüketim" unit="kWh / 100 km" value={values.consumption} step="0.1" onChange={(v) => update("consumption", v)} />
            <NumberField label="Elektrik birim fiyatı" unit="₺ / kWh" value={values.electricity} step="0.01" onChange={(v) => update("electricity", v)} />
            <NumberField label="Şarj kaybı" unit="%" value={values.loss} onChange={(v) => update("loss", v)} />
            <details><summary>Benzinli araçla karşılaştır</summary><div className="details-grid"><NumberField label="Benzin tüketimi" unit="L / 100 km" value={values.fuelConsumption} step="0.1" onChange={(v) => update("fuelConsumption", v)} /><NumberField label="Benzin fiyatı" unit="₺ / L" value={values.fuelPrice} step="0.01" onChange={(v) => update("fuelPrice", v)} /></div></details>
            <p className="hint">Birim fiyatını faturandan bulmak için aşağıdaki PDF okuyucuyu kullanabilirsin.</p>
          </div>
          <aside className="result-panel" aria-live="polite">
            <span className="result-label">TAHMİNİ ŞARJ MALİYETİ</span>
            <div className="big-number"><strong>{format.format(result.cost)}</strong><span>₺</span></div>
            <p>{format.format(values.distance).replace(",00", "")} km yol için, şarj kaybı dahil</p>
            <div className="result-grid"><div><span>Şebekeden çekilen</span><b>{format.format(result.energy)} kWh</b></div><div><span>100 km maliyeti</span><b>{format.format(values.distance ? result.cost / values.distance * 100 : 0)} ₺</b></div><div><span>Benzinli maliyeti</span><b>{format.format(result.fuel)} ₺</b></div><div className="saving"><span>Tahmini fark</span><b>{result.difference < 0 ? "−" : ""}{format.format(Math.abs(result.difference))} ₺</b></div></div>
            <div className="bar"><span style={{ width: `${result.fuel ? Math.min(100, Math.max(3, result.cost / result.fuel * 100)) : 50}%` }} /></div>
            <div className="bar-labels"><span>Elektrikli</span><span>%{Math.abs(result.percentage)} {result.difference >= 0 ? "daha düşük" : "daha yüksek"}</span><span>Benzinli</span></div>
            <button className="share" type="button" onClick={share}>Sonucu paylaş <span>↗</span></button>
          </aside>
        </div>
      </section>

      <section className="invoice" id="fatura">
        <div className="invoice-copy"><span className="kicker">02 / FATURA OKUYUCU</span><h2>Faturayı bırak,<br /><em>birim fiyatı bulalım.</em></h2><p>Elektrik faturandaki tüketim ve toplam tutarı cihazında okuyup yaklaşık birim maliyeti çıkarır. Dosyan hiçbir sunucuya yüklenmez.</p><div className="privacy"><span>✓</span><div><b>Yerel ve gizli</b><small>PDF yalnızca bu tarayıcıda işlenir.</small></div></div></div>
        <div className="upload-card">
          {!fileName && <label className={`dropzone${dragging ? " drag" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) readPdf(file); }}><input type="file" accept="application/pdf" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && readPdf(e.target.files[0])} /><span className="upload-icon">↥</span><b>PDF faturanı buraya bırak</b><small>veya dosya seçmek için tıkla · Maks. 10 MB</small></label>}
          {fileName && <div className="pdf-status"><div><span>{fileName}</span><small>{pdfMessage}</small></div><button onClick={() => { setFileName(""); setInvoice(null); }} aria-label="Dosyayı kaldır">×</button></div>}
          {invoice && <div className="invoice-result"><div><span>Bulunan tüketim</span><b>{format.format(invoice.kwh)} kWh</b></div><div><span>Bulunan tutar</span><b>{format.format(invoice.total)} ₺</b></div><div className="accent"><span>Yaklaşık birim fiyat</span><b>{format.format(invoice.rate)} ₺/kWh</b></div><button type="button" onClick={() => { setValues((v) => ({ ...v, electricity: Number(invoice.rate.toFixed(2)) })); location.hash = "hesapla"; notify("Birim fiyat hesaba uygulandı"); }}>Bu fiyatla hesapla</button></div>}
          <details className="manual"><summary>PDF okunmadı mı? Metni yapıştır</summary><textarea rows={4} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Faturadaki tüketim ve toplam tutarın geçtiği bölümü buraya yapıştır…" /><button type="button" onClick={analyzeManual}>Metni analiz et</button></details>
        </div>
      </section>

      <section className="guide" id="rehber"><div className="section-head"><div><span className="kicker">03 / İPUÇLARI</span><h2>Daha gerçekçi sonuç için</h2></div></div><div className="guide-grid"><article><span>01</span><h3>Göstergeyi referans al</h3><p>Son 500–1.000 km ortalama tüketimin, katalog verisinden daha gerçekçi sonuç verir.</p></article><article><span>02</span><h3>Şarj kaybını unutma</h3><p>Ev tipi AC şarjda kablo, dönüştürücü ve batarya nedeniyle genellikle ek enerji çekilir.</p></article><article><span>03</span><h3>Tarifeni kontrol et</h3><p>Faturandaki toplam bedel ve kWh değerinden efektif birim fiyatını hesaplayabilirsin.</p></article></div></section>
    </main>
    <footer><div className="brand"><span className="brand-mark">V</span><span>VoltHesap</span></div><p>Elektrikli yolculuğun sade hesabı.</p><span>Sonuçlar tahminidir · © 2026</span></footer>
    <div className={`toast${toast ? " show" : ""}`} role="status">{toast}</div>
  </>;
}

function NumberField({ label, unit, value, step = "1", onChange }: { label: string; unit: string; value: number; step?: string; onChange: (value: string) => void }) {
  return <label>{label}<span>{unit}</span><input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
