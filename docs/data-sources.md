# VoltHesap Data Sources

Last manual verification: 2026-10-26

## Electric vehicle catalogue

The initial catalogue contains eight Turkey-relevant battery-electric vehicle configurations. Vehicle specifications are stored in `public.vehicles`, not embedded in the frontend. Each record keeps its manufacturer source, verification date, specification notes, image credit, license, and image source URL.

| Vehicle | Configuration | Manufacturer source |
| --- | --- | --- |
| Togg T10X | V2 RWD Long Range | https://trumore-cdn.togg.cloud/EU/TOGG_T10X_0825_CTG_TR.pdf |
| Togg T10F | V1 RWD Long Range, 19-inch | https://trumore-cdn.togg.cloud/EU/TOGG_T10F_0825_CTG_TR.pdf |
| Tesla Model Y | Premium Long Range RWD | https://www.tesla.com/tr_tr/learn/introducing-new-model-y |
| Hyundai IONIQ 5 | 84 kWh RWD | https://www.hyundai.com/content/dam/hyundai/downloads/tr/tr/brosurler/ioniq5-digital-brosur.pdf |
| BYD SEALION 7 | 160 kW Design | https://www.bydauto.com.tr/storage/pdf/teknik/byd-sealion-7-teknik-ozellikler-ve-donanim-tablosu-23-01-26.pdf |
| Renault Megane E-Tech | Techno 60 kWh | https://www.renault.com.tr/elektrikli-araclar/megane-e-tech-elektrikli.html |
| MG MG4 Electric | Luxury 64 kWh | https://www.mg-turkey.com/upi/file/mg-mg4-brosur.pdf |
| Citroën ë-C3 | 83 kW Electric | https://talep.citroen.com.tr/api/model-pdf?model=yeni-ec3 |

Tesla does not publish a battery-capacity figure for the selected Model Y configuration, so the catalogue intentionally leaves that field empty instead of inserting an inferred value. The other battery fields preserve whether the source describes a gross, usable, or unspecified manufacturer capacity.

Vehicle photos are bundled locally for stable display. All eight are sourced from Wikimedia Commons under CC BY-SA 4.0; the database stores the author and original Commons page so the UI can display attribution. The image files must not be separated from their attribution metadata when reused.

The expanded catalogue also includes Tesla Model 3, Volvo EX30, BMW iX1, Kia EV3, Kia EV6, Škoda Enyaq, Peugeot E-208, Hyundai KONA Electric, BYD ATTO 3, and BYD DOLPHIN. Their technical values come from official manufacturer pages or technical sheets linked directly in the migration.

The Turkey-priority catalogue update adds Kia EV2 Air Long Range, KG Mobility Torres EVX MY26, and MINI Countryman E. The first seven catalogue positions follow the user-provided September 2026 Turkey sales order: Togg T10X, Togg T10F, Tesla Model Y, Kia EV2, Volvo EX30, KG Mobility Torres EVX, and MINI Countryman. This ranking is presentation metadata, not a technical specification or a permanently trusted sales dataset.

The follow-up catalogue migration adds both current Turkey-market BYD SEAL configurations (160 kW Design RWD and 390 kW AWD Excellence), the refreshed short-range Tesla Model Y Premium RWD, the Model Y RWD (Standard), and the standard-range Model 3 Premium RWD. Tesla battery capacity and range remain empty where the cited Turkey-market page only publishes official WLTP consumption. No third-party estimate is stored as a manufacturer value.

The expanded records intentionally have no image path yet. Add reviewed transparent assets to `public/vehicles` and update the matching `image_url`, `image_credit`, `image_license`, and `image_source_url` fields. Do not commit an image unless its reuse terms are known.

VoltHesap-owned generated catalogue renders are stored under `public/vehicles/generated`. Tesla Model Y, Tesla Model 3, Volvo EX30, BMW iX1, Kia EV2, Kia EV6, KG Mobility Torres EVX, MINI Countryman, and Škoda Enyaq currently use optimized WebP assets. The renders are presentation assets and must not be treated as technical references for trim-specific equipment.

The Togg T10X and T10F transparent WebP cutouts are derived from the catalogue's existing CC BY-SA 4.0 Wikimedia photos. Their original author, license, and source URL remain attached to the database records and must be preserved with the derived assets.

Signed-in users can save a vehicle that is not in the catalogue. These records live in `user_vehicles` under Row Level Security. Guests can apply the same inputs to the current calculation, but the data remains browser-only and is not written to Supabase.

## Public charging tariffs

| Network | Published tariffs | Power information | Official source |
| --- | --- | --- | --- |
| Trugo | AC: 9.95 TRY/kWh; DC: 12.00–14.98 TRY/kWh | The public tariff page does not publish a fixed power-to-price mapping | https://www.trugo.com.tr/price |
| ZES | AC: 10.99 TRY/kWh; DC-1: 12.99 TRY/kWh; DC-2: 16.49 TRY/kWh | AC products: 3.7–22 kW; DC: 60 kW; HPC products: 180–720 kW | https://zes.net/tr/fiyatlandirma |
| Voltrun | AC: 9.90 TRY/kWh; DC: 12.90 TRY/kWh | AC products: 7.4–22 kW; public FAQ states DC up to 500 kW | https://www.voltrun.com/tr/tarifeler |
| Oncharge | AC: 9.99 TRY/kWh; DC: 13.50 TRY/kWh | Published products include 22 kW AC and 40–720 kW DC | https://oncharge.com.tr/fiyatlar |
| Astor Şarj | AC: 9.89 TRY/kWh; DC: 13.99 TRY/kWh | AC: 22 kW; published DC products: 60–300 kW | https://astorsarj.com.tr/ |

Prices can vary by location, socket, membership, roaming agreement, or campaign. VoltHesap stores a dated snapshot and always keeps the session price editable. The selected socket shown in the operator's app is the final source of truth.

The published ZES price page does not explicitly map `DC-1` and `DC-2` to a power threshold. The power ranges stored by VoltHesap are therefore marked as indicative network capabilities, not a guaranteed tariff rule.

## Regulated electricity tariffs

The bundled defaults use EPDK Board Decision No. 14461, published in the Official Gazette on 2026-04-04 and effective from the same date:

- Official Gazette decision: https://www.resmigazete.gov.tr/eskiler/2026/04/20260404-4.pdf
- EPDK invoice calculator: https://lisans.epdk.gov.tr/epvys-web/faces/pages/online/tarifeFatura/tarifeFatura.xhtml

Stored defaults cover low-voltage, single-term, single-time residential and commercial stepped tariffs. The calculation must use the actual billing-period day count: residential low tier is 8 kWh/day and commercial low tier is 30 kWh/day. Values above the threshold are charged at the high-tier active-energy rate; the whole invoice does not switch tiers.

The 2026 residential last-resort-supply threshold is 4,000 kWh/year. Commercial and other applicable groups use a 15,000 kWh/year threshold. Users on SKTT, a bilateral agreement, or a multi-time tariff must not be treated as ordinary single-time national-tariff users.

## Update policy

These records are reference defaults, not silently trusted live prices. Future automated refreshes should:

1. Fetch only official operator or regulator pages.
2. Store a new dated snapshot instead of overwriting history.
3. Flag a changed value for review before making it active.
4. Preserve source URL, observed date, location-dependence, and campaign notes.
