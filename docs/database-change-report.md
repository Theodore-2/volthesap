# Database Change Report

## Status

- Change set: Initial VoltHesap schema
- Local migration: Prepared
- Local Postgres execution: Blocked because the Docker daemon remains unresponsive after its disk filled, even after freeing space and restarting Docker Desktop
- Remote Supabase execution: Not run
- Remote database changes: None

## Migration

`supabase/migrations/20261025154342_initial_schema.sql`

## Proposed tables

- `profiles`: User-facing profile preferences linked to `auth.users`
- `vehicles`: Public, read-only electric-vehicle catalogue
- `regulatory_sources`: Official tariff and regulation references with effective dates
- `electricity_tariffs`: Versioned residential and charging tariff definitions
- `electricity_tariff_components`: Energy, distribution, tax, fund, and fixed-fee components
- `user_vehicles`: Vehicles saved by an authenticated user
- `calculations`: Immutable cost-comparison history
- `invoice_analyses`: User-approved values extracted locally from electricity bills
- `invoice_line_items`: Itemized energy, distribution, tax, discount, and other bill amounts

PDF files and raw PDF text are not stored in the database.

All calculations and analyses work without authentication in the browser. Authentication is required only when a visitor chooses to save history or reports. Guest calculations are not written to the database.

## Security

- Row Level Security is enabled and forced on every table.
- Anonymous users can only read active catalogue vehicles.
- Authenticated users can only access their own profile, saved vehicles, calculations, and invoice analyses.
- Calculation inserts verify that an optional saved vehicle belongs to the current user.
- Saved calculation snapshots include charging habits, home/public charging share, household bills, tax assumptions, fuel comparison inputs, and report outputs.
- Client roles cannot write to the public vehicle catalogue.
- Public tariff records are readable only while their parent tariff is active.
- No secret key is referenced by the schema or frontend.

## Performance and integrity

- Foreign-key and common history-query columns are indexed.
- One default saved vehicle is allowed per user.
- Numeric ranges, currency codes, dates, URLs, and catalogue identifiers are validated with constraints.
- Vehicle records include battery, range, consumption, charging, performance, source, image-credit, and image-license fields.
- Timezone-aware timestamps are used throughout.

## Verification completed

- SQL and repository whitespace review: Passed
- Invoice parser fixture tests: Passed
- Application ESLint: Passed
- Application TypeScript check: Passed
- Application production build using Webpack: Passed

## Verification still required

Docker Desktop must respond successfully to `docker version`. After repairing the Docker daemon, run:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npm run supabase:types
```

Review the generated `lib/database.types.ts` file and test RLS with two separate authenticated users before applying the migration remotely.

## Remote application procedure

Do not execute these commands until the migration and RLS tests are approved:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

The remote `db push` must be explicitly approved by the project owner after reviewing this report.
