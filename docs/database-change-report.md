# Database Change Report

## Status

- Change set: Initial VoltHesap schema, trip and charging-session records, the sourced EV catalogue, and account-owned custom vehicles
- Local migration: Applied successfully
- Local Postgres execution: Passed with Docker Desktop and the local Supabase stack
- Remote Supabase execution: Applied through `20261026150450`
- Remote database changes: The first four migrations are applied; the latest catalogue-only migration remains local

## Migration

- `supabase/migrations/20261025154342_initial_schema.sql`
- `supabase/migrations/20261026080006_charging_sessions_and_trip_records.sql`
- `supabase/migrations/20261026121441_seed_vehicle_catalog.sql`
- `supabase/migrations/20261026150450_expand_vehicle_catalog_and_custom_vehicles.sql`
- `supabase/migrations/20261026154106_add_byd_seal_and_tesla_variants.sql`

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
- `trips`: User-owned real journey records with distance and fuel-comparison inputs
- `charging_sessions`: Ordered charging events belonging to a trip, including operator, energy, unit price, and optional session fee
- `charging_networks`: Public, read-only charging-network catalogue
- `charging_tariffs`: Dated public tariff snapshots with connector type, published price range, power range, source, and location-dependence metadata

The second migration also extends `calculations` with long-trip frequency, average long-trip distance, home charging amperage, voltage, phase count, and observed charger power.
It seeds verified 2026 charging tariff snapshots and EPDK residential/commercial reference tariff components. Source and caveat details are documented in `docs/data-sources.md`.

The third migration normalizes the vehicle battery-capacity field, records the capacity basis, adds catalogue ordering and specification notes, and seeds eight sourced EV configurations. Vehicle images are repository assets with CC BY-SA 4.0 attribution stored alongside each database record.

The fourth migration expands the catalogue to 18 sourced EV configurations and allows authenticated users to save a custom vehicle when their model is not listed. The 10 newly added catalogue records intentionally have no image reference until reviewed transparent PNG assets are added to the repository. Guests can use the same custom-vehicle form for a one-off calculation without creating a database record.

The fifth migration expands the catalogue to 23 configurations by adding both Turkey-market BYD SEAL versions, the refreshed short-range Tesla Model Y Premium RWD, the Model Y RWD (Standard), and the standard-range Model 3 Premium RWD. These records intentionally have no image reference until reviewed transparent PNG assets are available.

The sixth migration completes the currently missing Tesla battery and Model Y RWD range fields. Model Y RWD and Standard use approximately 60 kWh usable capacity and 534 km WLTP range; Long Range RWD uses approximately 75 kWh usable capacity and 622 km WLTP range.

PDF files and raw PDF text are not stored in the database.

All calculations and analyses work without authentication in the browser. Authentication is required only when a visitor chooses to save history or reports. Guest calculations are not written to the database.

## Security

- Row Level Security is enabled and forced on every table.
- Anonymous users can only read active catalogue vehicles.
- Authenticated users can only access their own profile, saved vehicles, calculations, and invoice analyses.
- Calculation inserts verify that an optional saved vehicle belongs to the current user.
- Trip and charging-session records are available only to their owner. Child-session policies verify ownership through the parent trip.
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

- All five migrations applied to the local Supabase database: Passed
- Local database schema lint: Passed
- Local database security and performance advisors: Passed
- Local migration-to-schema diff: Empty
- Seeded EV catalogue record review: Passed (23 active configurations)
- SQL and repository whitespace review: Passed
- Invoice parser fixture tests: Passed
- Application ESLint: Passed
- Application TypeScript check: Passed
- Application production build using Webpack: Passed

## Verification still required

Review the updated Tesla estimates in the application before applying the sixth migration remotely. The migration has not been pushed by Codex.

The following local checks can be rerun at any time:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npm run supabase:types
```

## Remote application procedure

Do not execute these commands until the migration and RLS tests are approved:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

The remote `db push` must be explicitly approved by the project owner after reviewing this report.
