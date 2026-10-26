# VoltHesap

VoltHesap is a responsive web application for comparing electric-vehicle charging costs with fuel costs and, later, analysing electricity bills and trip history.

The original static interface is preserved in `preview/` as a visual reference.

## Technology

- Next.js and TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Browser-side PDF parsing

## Requirements

- Node.js 20 or newer
- npm
- Docker Desktop, only when running Supabase locally

## Install dependencies

```bash
npm install
```

The project uses `package-lock.json`, so CI and clean environments should use:

```bash
npm ci
```

## Environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Then set these public values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=https://www.volthesap.autos
```

`NEXT_PUBLIC_SUPABASE_URL` is the Supabase **Project URL**. It is not a key. The publishable key is a separate value and may be used by browser code when Row Level Security is configured correctly.

Never commit secret keys. A Supabase secret key must not use the `NEXT_PUBLIC_` prefix and must only be available to trusted server-side code. The Vercel Supabase integration can manage the production environment variables automatically.

`NEXT_PUBLIC_SITE_URL` controls canonical URLs, social sharing metadata, the sitemap, and robots metadata. Production defaults to `https://www.volthesap.autos`; override it for another deployment only when needed.

## Run the web application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run build
```

## Local Supabase development

The Supabase CLI is installed as a pinned development dependency. Run all commands from the repository root.

Start the local stack:

```bash
npm run supabase:start
```

Reset the local database and apply all migrations and seed data:

```bash
npm run supabase:reset
```

Lint the local database:

```bash
npm run supabase:lint
```

Generate TypeScript database types:

```bash
npm run supabase:types
```

Stop the local stack:

```bash
npm run supabase:stop
```

## Database workflow

Database schema changes belong in versioned SQL files under `supabase/migrations/`. Create a migration with:

```bash
npx supabase migration new descriptive_change_name
```

Add repeatable development data to `supabase/seed.sql`. Large application datasets, such as a vehicle catalogue, may be maintained as JSON source files and imported separately, but database schema migrations remain SQL.

To connect this checkout to an existing hosted Supabase project later:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db pull
```

Do not run remote migration or deployment commands until the generated SQL has been reviewed and tested locally.

## Dependency overview

- `next`, `react`, and `react-dom`: application framework and UI runtime
- `@supabase/supabase-js` and `@supabase/ssr`: database and authentication clients
- `pdfjs-dist`: PDF parsing
- `tailwindcss`: styling
- `supabase`: local database, migration, linting, and type-generation CLI
