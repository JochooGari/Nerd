## NERD Performance Dashboard (React + Vite + Tailwind)

A lightweight, Power BI–compatible dashboard to monitor SFCC technical performance and promotion impact.

### 1) Scope and Goals
- Build a modern dashboard (React + Tailwind) using Recharts and CSVs (no backend).
- Track technical KPIs for pages like `Product-Show`, cart and checkout.
- Compare performance across versions (`nglora_version`, `compatibility_mode`).
- Analyze promotions/coupons impact; generate a realistic simulated dataset to study causality.

### 2) KPIs and Definitions
- Performance (site-day):
  - Requests: `fact_site_daily.total_requests`
  - Avg Response (ms): `fact_site_daily.avg_response_time_ms`
  - Cache Hit (%): `fact_site_daily.cache_hit_rate`
  - Error Rate (%): `fact_site_daily.error_rate`
- Include Controller (Product-Show):
  - Nb requests, % of main, Avg response (ms)
- Promotions:
  - Promotions actives (distinct): `fact_promo_daily.promotions_active`
  - Distinct coupons, Coupon uses, Promo visits/activations
- Cart/Checkout latency (from includes):
  - `fact_cart_daily.cart_include_avg_response_ms`
  - `fact_checkout_daily.checkout_include_avg_response_ms`
- Versioning:
  - `nglora_version`, `compatibility_mode` joined into `fact_site_daily`
- Best Practices Score (max 30): sum of 6 subscores {1,2,3,5}
  - Cache hit rate, Avg response, Error rate, Product-Show include count, Coupon count, API ratio

### 3) Data Sources
- Real SFCC extracts (`data_SFCC/data_SFCC`): controllers, include controllers, OCAPI/SCAPI, promos, line items, sites, user agents.
- Realm/version signals (`sample json/realms.json`): `compatibility_mode`, `ngl_version`.
- Derived facts via ETL (Python/pandas).

### 4) ETL and Outputs
Generate all datasets (Windows PowerShell):
```powershell
# From repo root
.\.venv\Scripts\Activate.ps1  # if needed
python perf_dataset\etl\build_perf_dataset.py
```
Key outputs written to `perf_dataset/`:
- Dimensions: `dim_date.csv`, `dim_site.csv`, `dim_controller.csv`
- Performance:
  - `fact_controller_daily.csv`, `fact_include_controller_daily.csv`, `fact_site_daily.csv`
  - `fact_api_daily.csv`
- Promotions:
  - `fact_promo_daily.csv` (includes `promotions_active`)
  - `fact_cart_daily.csv`, `fact_checkout_daily.csv`
  - `fact_promo_perf.csv` (promo + cart/checkout join)
  - `fact_promo_perf_sim.csv` (simulated correlation dataset)
- Score:
  - `fact_best_practices_score.csv`

Copy to the web app:
```powershell
mkdir webapp\public\data -Force | Out-Null
Copy-Item perf_dataset\*.csv webapp\public\data\ -Force
```

### 5) Simulated Data (for impact analysis)
- File: `fact_promo_perf_sim.csv`
- Columns: `site_id`, `request_date`, `promotions_active`, `sim_cart_latency_ms`, `sim_checkout_latency_ms`.
- Method: linear relation between `promotions_active` and latency with Gaussian noise, slopes calibrated from real medians (no fabricated traffic). Useful to test trends and visualize sensitivity where direct causal inference is hard.

### 6) Versions Auto-Mapping
- If `etl/version_mapping.csv` is empty, the ETL reads `sample json/realms.json` and generates a realistic mapping:
  - Uses latest `ngl_version` + up to 3 previous minor versions.
  - Splits the historical period into contiguous windows and assigns versions to all sites.
- You can override by filling `etl/version_mapping.csv`:
  - Columns: `site_id,date_from,date_to,nglora_version,compatibility_mode`.

### 7) Frontend (Tech + Run)
- Stack: React 18 + Vite + TypeScript, Tailwind CSS, Recharts.
- Data: static CSVs under `webapp/public/data/`.
- Run locally:
```bash
npm install
npm run dev
```
- Build (Vercel):
```bash
npm run build
```

### 8) UX and Pages (aligned with Figma style)
- Overview
  - Filters: Site, Date range, Version, Compatibility
  - KPI cards: Requests, Avg Response, Cache Hit, Error Rate
  - Trends: Requests, Avg Response, Cache Hit (daily lines)
- Product-Show Details
  - Include Controller table: Controller, Nb requests, % of main, Avg response (ms)
- Promotions & Performance
  - Dual-line: Promotions actives vs Distinct coupons (daily)
  - Scatter: Promotions vs Cart latency (simulé)
  - Scatter: Promotions vs Checkout latency (simulé)
- Styling: Tailwind cards, soft shadows, Inter font; tokens can be adjusted to match `public/figma/` palette.

### 9) Power BI Compatibility
- Flat CSVs with stable column names.
- Measures mirror simple aggregations (SUM/DIVIDE equivalents in DAX).

### 10) Assumptions & Notes
- Real data only from provided SFCC extracts; no synthetic volumes added.
- Simulated latency is clearly marked and separated in its own file.
- Some pages (checkout includes) depend on available include-controller rows; if missing for a site, related charts may be empty.

### 11) Troubleshooting
- No data in the app: ensure CSV names and location `webapp/public/data/`.
- Versions show `unknown`: fill `etl/version_mapping.csv` or keep auto-generation via `realms.json`.
- Re-run ETL after changing mappings, then re-copy CSVs.
