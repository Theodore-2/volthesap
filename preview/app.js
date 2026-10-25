const $ = (id) => document.getElementById(id);
const ids = ['distance','consumption','electricity','loss','fuelConsumption','fuelPrice'];
const tr = new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const val = id => Math.max(0, Number($(id).value) || 0);

function calculate(){
  const km=val('distance'), con=val('consumption'), rate=val('electricity'), loss=Math.min(50,val('loss'));
  const energy=km/100*con*(1+loss/100), cost=energy*rate, fuel=km/100*val('fuelConsumption')*val('fuelPrice'), diff=fuel-cost;
  $('totalCost').textContent=tr.format(cost); $('gridEnergy').textContent=`${tr.format(energy)} kWh`; $('per100').textContent=`${tr.format(km ? cost/km*100 : 0)} ₺`;
  $('fuelCost').textContent=`${tr.format(fuel)} ₺`; $('saving').textContent=`${diff>=0?'':'−'}${tr.format(Math.abs(diff))} ₺`;
  $('routeText').textContent=`${tr.format(km).replace(',00','')} km yol için, şarj kaybı dahil`;
  const pct=fuel ? Math.round(diff/fuel*100) : 0; $('savingPercent').textContent=diff>=0?`%${Math.max(0,pct)} daha düşük`:`%${Math.abs(pct)} daha yüksek`;
  $('evBar').style.width=`${fuel ? Math.min(100,Math.max(3,cost/fuel*100)) : 50}%`;
  const u=new URL(location.href); ids.forEach(id=>u.searchParams.set(id,$(id).value)); history.replaceState(null,'',u);
}
const params=new URLSearchParams(location.search); ids.forEach(id=>{if(params.has(id)) $(id).value=params.get(id); $(id).addEventListener('input',calculate)}); calculate();

$('shareBtn').addEventListener('click',async()=>{const text=`VoltHesap sonucu: ${$('routeText').textContent} tahmini maliyet ${$('totalCost').textContent} ₺.`; try{if(navigator.share) await navigator.share({title:'VoltHesap sonucum',text,url:location.href}); else{await navigator.clipboard.writeText(`${text} ${location.href}`);showToast('Sonuç bağlantısı kopyalandı')}}catch(e){if(e.name!=='AbortError')showToast('Paylaşım açılamadı')}});
function showToast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200)}

const drop=$('dropzone'), input=$('pdfInput'); drop.onclick=()=>input.click();
['dragenter','dragover'].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.add('drag')}));
['dragleave','drop'].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.remove('drag')}));
drop.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)readPdf(f)}); input.addEventListener('change',()=>input.files[0]&&readPdf(input.files[0]));
$('removePdf').onclick=()=>{input.value='';$('pdfStatus').hidden=true;$('invoiceResult').hidden=true;drop.hidden=false};

async function readPdf(file){
  if(file.type!=='application/pdf'||file.size>10*1024*1024){showToast('10 MB altında bir PDF seç');return}
  drop.hidden=true;$('pdfStatus').hidden=false;$('fileName').textContent=file.name;$('pdfMessage').textContent='Belge cihazında okunuyor…';
  try{const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;let text='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();text+=' '+content.items.map(x=>x.str).join(' ')}$('pdfMessage').textContent=`${pdf.numPages} sayfa okundu`;analyzeInvoice(text)}catch(e){$('pdfMessage').textContent='Metin otomatik okunamadı; aşağıya yapıştırabilirsin.'}
}
function num(s){if(!s)return null;let x=s.replace(/\s/g,'').replace(/₺|TL|TRY/gi,'');if(x.includes(',')&&x.includes('.'))x=x.lastIndexOf(',')>x.lastIndexOf('.')?x.replace(/\./g,'').replace(',','.'):x.replace(/,/g,'');else if(x.includes(','))x=x.replace(',','.');return Number(x)}
function analyzeInvoice(text){
  const clean=text.replace(/\s+/g,' '), kwhPatterns=[/(?:tüketim|toplam tüketim|enerji)[^\d]{0,35}([\d.,]+)\s*kWh/i,/([\d.,]+)\s*kWh/i], totalPatterns=[/(?:ödenecek tutar|fatura tutarı|toplam tutar|genel toplam)[^\d]{0,25}([\d.,]+)\s*(?:TL|₺|TRY)/i,/(?:ödenecek tutar|fatura tutarı|genel toplam)[^\d]{0,25}([\d.,]+)/i];
  let kwh=null,total=null;for(const p of kwhPatterns){const m=clean.match(p);if(m){kwh=num(m[1]);break}}for(const p of totalPatterns){const m=clean.match(p);if(m){total=num(m[1]);break}}
  if(kwh&&total){const rate=total/kwh;$('foundKwh').textContent=`${tr.format(kwh)} kWh`;$('foundTotal').textContent=`${tr.format(total)} ₺`;$('foundRate').textContent=`${tr.format(rate)} ₺/kWh`;$('invoiceResult').dataset.rate=rate;$('invoiceResult').hidden=false;showToast('Fatura değerleri bulundu')}else{showToast('Tüketim ve toplam tutar birlikte bulunamadı');$('invoiceResult').hidden=true}
}
$('analyzeText').onclick=()=>analyzeInvoice($('invoiceText').value);
$('useRate').onclick=()=>{$('electricity').value=Number($('invoiceResult').dataset.rate).toFixed(2);calculate();location.hash='hesapla';showToast('Birim fiyat hesaba uygulandı')};
