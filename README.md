<p align="center">
  <img src="public/brand/volthesap-mark.png" width="88" alt="VoltHesap logo" />
</p>

<h1 align="center">VoltHesap</h1>

<p align="center">
  Understand the real cost of driving and charging an electric vehicle in Türkiye.
</p>

<p align="center">
  <a href="https://www.volthesap.autos">Live website</a> ·
  <a href="#run-locally">Run locally</a> ·
  <a href="#contributing">Contribute</a>
</p>

## About

VoltHesap is an open-source EV cost calculator built for drivers in Türkiye. It combines vehicle data, charging habits, public charging sessions, household electricity bills, charging losses and fuel comparisons in one responsive web application.

The project aims to answer practical questions such as:

- How much did a trip actually cost after charging losses?
- What will my charging habits cost over 1, 3, 6 or 12 months?
- How much of my electricity bill belongs to the car?
- What would the same distance cost with a petrol or diesel vehicle?
- How much money and carbon could an EV save?

## Features

- Trip cost calculator with multiple charging sessions
- Monthly charging budget and long-term projections
- Home, mixed and public charging scenarios
- Charging-loss and home charging-time estimates
- EV catalogue with battery, consumption and WLTP data
- Electricity bill analysis from PDF files and images using browser-side OCR
- Electricity tariff, distribution charge and tax breakdowns
- Petrol and diesel cost comparisons
- Responsive interface for desktop and mobile
- Optional Supabase-backed vehicle, tariff and user data

## Privacy

Invoice PDF and image parsing runs locally in the browser. The document itself is not uploaded to VoltHesap. Supabase is currently used for public catalogue data and is prepared for optional account features.

## Technology

- Next.js, React and TypeScript
- Tailwind CSS
- Supabase Postgres, Auth and Row Level Security
- PDF.js and Tesseract.js
- Vercel Analytics and hosting

## Run locally

### Requirements

- Node.js 20 or newer
- npm
- Docker Desktop only when running Supabase locally

Clone the repository and install dependencies:

```bash
git clone https://github.com/Theodore-2/volthesap.git
cd volthesap
npm ci
```

Create your local environment file:

```bash
cp .env.example .env.local
```

Add your public Supabase configuration:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase development

The Supabase CLI is installed as a pinned development dependency.

```bash
# Start the local stack
npm run supabase:start

# Recreate the database from migrations and seed data
npm run supabase:reset

# Check the local database
npm run supabase:lint

# Generate TypeScript database types
npm run supabase:types

# Stop the local stack
npm run supabase:stop
```

Create schema changes as versioned migrations:

```bash
npx supabase migration new descriptive_change_name
```

Review and test every migration locally before pushing it to a hosted database.

## Security

Only the Supabase project URL and publishable key belong in browser code. These values are designed to be public and are protected by database permissions and Row Level Security.

Never commit or expose any of the following:

- Supabase secret keys
- The legacy `service_role` key
- The JWT secret
- Postgres passwords or connection strings
- Any `.env` or `.env.local` file

All public-schema tables in this project have Row Level Security enabled. User-owned records are restricted with ownership policies based on `auth.uid()`.

Please report security issues privately to [hello@volthesap.autos](mailto:hello@volthesap.autos) instead of opening a public issue.

## Project structure

```text
app/                    Next.js routes and metadata
components/             Application interface
lib/                    Calculations, invoice parsing and Supabase clients
public/                  Brand and vehicle assets
supabase/migrations/     Versioned database schema
supabase/seed.sql        Repeatable local development data
tests/                   Focused parser tests
preview/                 Original static design reference
```

## Contributing

Issues and pull requests are welcome. Keep repository content, code comments and commit messages in English. Please explain user-facing calculation changes and include their data source when applicable.

## License

The source code is available under the [MIT License](LICENSE).

Vehicle names and logos are trademarks of their respective owners. Files under `public/vehicles/` are not granted for reuse under the MIT License unless explicitly stated by their original source.

## Author

Created by [Arda Çimen](https://ardacimen.dev) · [LinkedIn](https://linkedin.com/in/-arda-cimen)
