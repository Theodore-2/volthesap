# VoltHesap Data Sources

Last manual verification: 2026-10-26

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
