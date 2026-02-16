# NERD Dashboard - Flux de données (Version 3.0)

**Date**: 2026-01-12

---

## 📊 Vue d'ensemble du flux

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          SFCC Data Lakehouse (CCDW)                      │
│                                                                          │
│  • ccdw_aggr_controller_request_aaqp_prd                                │
│  • ccdw_aggr_include_controller_request_aaqp_prd                        │
│  • ccdw_aggr_scapi_request_aaqp_prd                                     │
│  • ccdw_aggr_ocapi_request_aaqp_prd                                     │
│  • ccdw_aggr_promotion_activation_aaqp_prd                              │
│  • ccdw_fact_promotion_line_item_aaqp_prd                               │
│  • ccdw_dim_site_aaqp_prd                                               │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ JDBC
                                    │ (Elias - Data Engineer)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Requêtes SQL (RAW DATA ONLY)                          │
│                                                                          │
│  SELECT site_id, request_date, controller_name,                         │
│         cache_behavior, status_code,    ← BRUT, pas de CASE WHEN        │
│         SUM(num_requests) AS num_requests,                              │
│         SUM(response_time) AS response_time_ms                          │
│  FROM ccdw_aggr_controller_request_aaqp_prd                             │
│  GROUP BY site_id, request_date, controller_name,                       │
│           cache_behavior, status_code;                                  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Export CSV
                                    │ UTF-8, virgule, header
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          Fichiers CSV bruts                              │
│                                                                          │
│  • fact_controller_daily_raw_20260112.csv                               │
│  • fact_site_daily_raw_20260112.csv                                     │
│  • fact_include_controller_daily_raw_20260112.csv                       │
│  • fact_api_daily_raw_20260112.csv                                      │
│  • ...                                                                   │
│                                                                          │
│  Volumétrie: ~200 MB/jour                                               │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Azure Storage Upload
                                    │ (SAS Token Write)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Azure Storage Account (nerdsa)                      │
│                                                                          │
│  Container: nerd-data                                                   │
│  Folder: /technical-monitoring/                                         │
│                                                                          │
│  https://nerdsa.blob.core.windows.net/nerd-data/                       │
│         technical-monitoring/fact_controller_daily_raw_20260112.csv     │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Power BI Load
                                    │ (Expert Power BI)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Power Query Transformations (M)                       │
│                                                                          │
│  1. Charger CSV depuis Azure Blob                                       │
│  2. Typer les colonnes                                                  │
│  3. Ajouter flags:                                                      │
│     cache_hit_flag = if Text.Upper([cache_behavior]) = "HIT" then 1    │
│     error_flag = if status_code starts with "4" or "5" then 1          │
│  4. Calculer colonnes intermédiaires:                                   │
│     cache_hit_requests = [num_requests] * [cache_hit_flag]             │
│     error_requests = [num_requests] * [error_flag]                     │
│  5. Agréger (Table.Group):                                              │
│     GROUP BY site_id, request_date, controller_name                     │
│     SUM(num_requests), SUM(cache_hit_requests), SUM(error_requests)    │
│  6. Calculer moyennes et taux:                                          │
│     avg_response_time_ms = total_response_time_ms / total_requests     │
│     cache_hit_rate = cache_hit_requests / total_requests               │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Load to Model
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Power BI Data Model (Import)                         │
│                                                                          │
│  Tables finales:                                                        │
│  • fact_controller_daily (site_id, request_date, controller_name,      │
│    total_requests, cache_hit_requests, error_requests, ...)            │
│  • fact_site_daily                                                      │
│  • fact_include_controller_daily                                        │
│  • fact_api_daily                                                       │
│  • dim_site                                                             │
│  • ...                                                                   │
│                                                                          │
│  Relations: 25 relations (schéma étoile)                                │
│  Mesures DAX: 18 mesures                                                │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Visualizations
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       Power BI Service (Dashboard)                       │
│                                                                          │
│  Visuels:                                                               │
│  • Performance par site                                                 │
│  • Cache hit rate                                                       │
│  • Error rate                                                           │
│  • API response time                                                    │
│  • Promotions actives                                                   │
│  • ...                                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux alternatif: LOT1 (JSON files)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      SharePoint (État actuel)                            │
│                                                                          │
│  https://loreal.sharepoint.com/.../NERD/Data/                           │
│  • realms.json                                                          │
│  • ods.json                                                             │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Migration (Houssem - DevOps)
                                    │ Download + Upload
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Azure Storage Account (nerdsa)                      │
│                                                                          │
│  Container: nerd-data                                                   │
│  Folders: /realms/, /ods/                                               │
│                                                                          │
│  https://nerdsa.blob.core.windows.net/nerd-data/realms/realms.json     │
│  https://nerdsa.blob.core.windows.net/nerd-data/ods/ods.json           │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Power BI Load
                                    │ (Reconfiguration sources)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Power BI Data Model (Import)                         │
│                                                                          │
│  Tables:                                                                │
│  • Fact_Realms Daily (depuis realms.json)                              │
│  • fact_ODS Daily (depuis ods.json)                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Points clés

### 1. Responsabilités

| Équipe | Responsabilité | Outils |
|--------|----------------|--------|
| **Elias (Data)** | Exécution SQL, Export CSV, Upload Azure | JDBC, CSV export, Azure CLI/Storage Explorer |
| **Expert Power BI** | Transformations M, Validation | Power BI Desktop, Power Query M |
| **Houssem (DevOps)** | Clés d'accès, Migration LOT1 | Azure Portal, SAS Tokens |

### 2. Données BRUTES (Version 3.0)

Les colonnes **cache_behavior** et **status_code** sont retournées **telles quelles** dans les CSV.

**Aucune transformation conditionnelle** (CASE WHEN) n'est faite côté SQL.

### 3. Transformations Power Query

Toutes les transformations logiques se font en Power Query:
- Flags (`cache_hit_flag`, `error_flag`)
- Agrégations finales (GROUP BY site_id, request_date, controller_name)
- Calculs de moyennes et taux

### 4. Avantages

✅ **Changement de règle métier**: Modifier le code M, pas besoin de reload CCDW
✅ **Indépendance**: Elias fournit les données brutes sans règles métier
✅ **Performance**: Agrégations SQL (réduction volumétrie) + transformations M (flexibilité)

---

## 📅 Fréquence de rafraîchissement

| Type de données | Fréquence suggérée | Mode |
|-----------------|--------------------|----- |
| Technical Monitoring (CSV) | Quotidien | Automatique (Airflow/ADO) |
| realms.json | À la demande | Manuel ou trigger |
| ods.json | À la demande | Manuel ou trigger |

---

## 🔒 Sécurité

- **JDBC CCDW**: Credentials via Key Vault
- **Azure Storage**: SAS Token avec permissions Write (Elias), Read (Power BI)
- **Power BI Service**: Refresh via Gateway avec credentials sécurisés

---

**Fin du document**

*Généré le 2026-01-12*
