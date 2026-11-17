# HaatBazar AI — research and plan

## Audit
Before: hardcoded prices labelled "Real-Time Mandi Rates"; invented trends and sell-timing advice; profit used Dhaka retail − ৳5; random 94–98 "AI quality scan"; specific pesticide doses without a source. The code contained no marketplace (no listings, sellers, buyers, orders), so the product scope is **farmer decision support**, not commerce. No marketplace features were invented.

## Research (checked 2026-11-05)

| # | Reference | Finding | Reliability | Licence / use |
|---|---|---|---|---|
| 1 | Department of Agricultural Marketing (DAM), dam.gov.bd (via FE, Dhaka Tribune) | Collects producer/wholesale/retail prices daily; publishes reports (PDF per AgriPriceBD dataset) | News + dataset description; site itself not opened | Linked; not scraped |
| 2 | AgriPriceBD dataset (Mendeley Data) | Daily prices extracted from government PDF reports | Academic dataset | Possible future source; licence not checked |
| 3 | Krishi Call Centre 16123 (BSS July 2026, Dhaka Tribune, DAE Lakshmipur page) | DAE call centre, 92,094 calls Jul 2025–Jun 2026; ~25 paisa/min reported | News + govt page | Number shown |
| 4 | Krishoker Janala (a2i / South-South Galaxy) | Govt app: disease images, symptoms, prevention | Govt-linked | Pointed to for photo-based identification |
| 5 | Plantix Bangladesh pilot (Feed the Future DAA reports) | Crop-issue identification pilot 2021 | Donor reports | Pattern only |
| 6 | iFarmer "Folon" (Future Startup, Startup Bangladesh) | Smartphone farming app with disease remedies | Press | Pattern only |
| 7 | Open-Meteo (project README, packagist summary, DEV article) | No key; data CC BY 4.0 with attribution; free tier non-commercial (sources conflict on commercial use) | Mixed | Used with attribution; commercial use needs checking |
| 8 | Banglapedia "Crop"; UN CC:Learn glossary; USDA GAIN Grain & Feed 2024 | Rabi ≈ Oct/Nov–Mar; Kharif-1 ≈ late Mar–Jun; Kharif-2 ≈ Jul–Oct; Aus/Aman/Boro windows | Reference/official | Calendar shown with "boundaries vary" note |
| 9 | FEWS NET Bangladesh data book | Aus/Aman/Boro treated as production systems of one crop | Official programme | Background |

**Conclusions used**
1. Reliable daily prices exist only as official reports we cannot license or scrape here → farmers record prices they heard, with source and date; link to DAM.
2. The decision farmers face is "is the trip worth it" → full-cost trip calculator with break-even price.
3. Weather is the most useful live input and is freely available → Open-Meteo forecast + spray-window rule (rain ≥50% or ≥1 mm in 6 h, or wind ≥15 km/h → wait).
4. Chemical advice without verified, product-specific guidance is unsafe → doses removed; label + 16123 + Upazila office.

## Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Remove fabricated prices/trends/scan; remove doses | Done |
| P0 | Full-cost trip calculator, break-even, truck share | Done |
| P1 | Dated price notebook with staleness | Done |
| P1 | Weather + spray window with attribution | Done |
| P1 | Season & rice calendar | Done |
| P2 | Import DAM daily report (needs permission/format agreement) | Not done |
| P2 | Bangla voice price entry | Not done |
| P3 | Marketplace (listings, buyer contact) | Not planned — not in the existing product; needs trust & safety design |

## Testing
`tests/haatbazar.test.ts` (7 tests). Browser: no "real-time" claims, 16123 visible, live forecast with attribution and spray advice, trip result, "sell locally" when costs exceed gap, price note persists with per-maund conversion, weather API rejects unknown district.
