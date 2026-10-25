# VoltHesap

Elektrikli araç kullanıcıları için şarj maliyeti, enerji tüketimi ve elektrik faturası analiz aracı.

## Teknoloji

- Next.js ve TypeScript
- Tailwind CSS
- Supabase Auth ve Postgres altyapısı
- Tarayıcı içinde PDF analizi

İlk statik tasarımın eksiksiz kopyası `preview/` klasöründe korunur.

## Yerel geliştirme

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase bağlantısı için `.env.local` dosyasında proje URL'si ve publishable key tanımlanmalıdır.
