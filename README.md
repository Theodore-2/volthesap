# VoltHesap

Elektrikli araç kullanıcıları için şarj maliyeti, enerji tüketimi ve elektrik faturası analiz aracı.

## Gereksinimler

- Node.js 20 veya üzeri
- npm
- Kullanıcı girişi ve kayıt özellikleri için bir Supabase projesi

Sürümleri kontrol etmek için:

```bash
node --version
npm --version
```

## Kurulum

Projeyi klonladıktan sonra klasöre gir:

```bash
git clone https://github.com/Theodore-2/volthesap.git
cd volthesap
```

Bağımlılıkları yükle:

```bash
npm install
```

Ortam değişkeni dosyasını oluştur:

```bash
cp .env.example .env.local
```

`.env.local` içindeki değerleri Supabase projenin **Connect** ekranındaki URL ve publishable key ile doldur:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`NEXT_PUBLIC_` ile başlayan değerler tarayıcıya gönderilir. Bu nedenle secret key veya service-role key değerlerini bu değişkenlere koyma ve Git'e commit etme.

## Çalıştırma

Geliştirme sunucusunu başlat:

```bash
npm run dev
```

Ardından tarayıcıda [http://localhost:3000](http://localhost:3000) adresini aç.

Sunucuyu durdurmak için terminalde `Ctrl + C` kullan.

## Kontroller

Kod kalitesi kontrolü:

```bash
npm run lint
```

Üretim derlemesi:

```bash
npm run build
```

Üretim derlemesini yerelde çalıştırmak için:

```bash
npm run start
```

## Temel bağımlılıklar

| Paket | Kullanım amacı |
| --- | --- |
| `next` | Web uygulaması, sayfalar ve sunucu tarafı işlemler |
| `react`, `react-dom` | Kullanıcı arayüzü |
| `typescript` | Tip güvenliği |
| `@supabase/supabase-js` | Supabase veritabanı ve Auth istemcisi |
| `@supabase/ssr` | Next.js için çerez tabanlı Supabase oturumları |
| `tailwindcss` | Yardımcı CSS sınıfları |
| `pdfjs-dist` | Elektrik faturası PDF'lerini tarayıcıda okuma |
| `lucide-react`, `@radix-ui/*` | İkonlar ve erişilebilir arayüz bileşenleri |

Tam bağımlılık ve script listesi için `package.json` dosyasına bakabilirsin. Kesin sürümler `package-lock.json` içinde kilitlidir.

## Proje yapısı

```text
app/           Next.js sayfaları, layout ve global stiller
components/    Arayüz ve VoltHesap bileşenleri
lib/supabase/  Tarayıcı ve sunucu Supabase istemcileri
preview/       İlk statik HTML/CSS/JavaScript tasarımının korunan kopyası
```

`.env.local`, Supabase secret key'leri ve kişisel PDF dosyaları repoya eklenmemelidir.
