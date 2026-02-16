# Actions pour Elias Tanos (Data Engineer) - NERD Dashboard

**Date**: 2026-01-12
**Contact**: elias.tanios@loreal.com
**Priorité**: HAUTE

---

## 🎯 Résumé

Vous devez exécuter les requêtes SQL fournies sur le DWH CCDW et uploader les CSV résultants sur Azure Storage.

**Important**: Les requêtes retournent les données **BRUTES** (status_code, cache_behavior). Aucune transformation conditionnelle n'est requise de votre côté.

---

## 📋 Actions requises

### 1️⃣ Récupérer les clés d'accès JDBC

**Contact**: Houssem (DevOps)

Vous avez besoin de:
- Driver: B2C Commerce Intelligence JDBC Driver
- Connection string CCDW
- Username / Password ou certificat

---

### 2️⃣ Exécuter les requêtes SQL

**Fichier**: [`extractions_raw_CORRECTED.sql`](extractions_raw_CORRECTED.sql)

Ce fichier contient 7 requêtes principales:

| # | Source CCDW | Table(s) Power BI | Description |
|---|-------------|-------------------|-------------|
| 1 | ccdw_dim_site_aaqp_prd | dim_site | Dimension sites (pas d'agrégation) |
| 2 | ccdw_aggr_controller_request_aaqp_prd | fact_controller_daily, fact_site_daily | Controllers avec status_code et cache_behavior |
| 3 | ccdw_aggr_include_controller_request_aaqp_prd | fact_include_controller_daily, fact_include_cache_daily, fact_cart_daily, fact_checkout_daily | Include controllers avec cache_behavior |
| 4 | ccdw_aggr_scapi_request_aaqp_prd | fact_api_daily, fact_api_resource_daily | API SCAPI avec status_code |
| 5 | ccdw_aggr_ocapi_request_aaqp_prd | fact_api_daily, fact_api_resource_daily | API OCAPI avec status_code |
| 6 | ccdw_aggr_promotion_activation_aaqp_prd | fact_promo_daily | Promotions (activations) |
| 7 | ccdw_fact_promotion_line_item_aaqp_prd | fact_promo_daily | Promotions (line items) |

**IMPORTANT**: Les requêtes retournent **status_code** et **cache_behavior** dans le GROUP BY. Ne pas appliquer de CASE WHEN ni de transformation conditionnelle.

### Exemple de requête (fact_controller_daily)
```sql
SELECT
  site_id,
  request_date,
  controller_name,
  cache_behavior,  -- BRUT, pas de transformation
  status_code,     -- BRUT, pas de transformation
  SUM(num_requests) AS num_requests,
  SUM(response_time) AS response_time_ms
FROM ccdw_aggr_controller_request_aaqp_prd
GROUP BY site_id, request_date, controller_name, cache_behavior, status_code;
```

**Note**: Les transformations (cache_hit_requests, error_requests) seront faites côté Power BI, pas côté SQL.

---

### 3️⃣ Exporter les résultats en CSV

Pour chaque requête, exporter le résultat en CSV avec:
- **Encodage**: UTF-8
- **Séparateur**: virgule (,)
- **Header**: inclure les noms de colonnes

**Nomenclature des fichiers**:
```
dim_site_YYYYMMDD.csv
fact_controller_daily_raw_YYYYMMDD.csv
fact_site_daily_raw_YYYYMMDD.csv
fact_include_controller_daily_raw_YYYYMMDD.csv
fact_include_cache_daily_raw_YYYYMMDD.csv
fact_api_daily_raw_YYYYMMDD.csv
fact_api_resource_daily_raw_YYYYMMDD.csv
fact_cart_daily_raw_YYYYMMDD.csv
fact_checkout_daily_raw_YYYYMMDD.csv
fact_promo_daily_activations_YYYYMMDD.csv
fact_promo_daily_lineitems_YYYYMMDD.csv
```

**Exemple**: `fact_controller_daily_raw_20260112.csv`

---

### 4️⃣ Récupérer les clés Azure Storage (Write)

**Contact**: Houssem (DevOps)

Vous avez besoin de:
- Storage Account: `nerdsa`
- Container: `nerd-data`
- Sous-dossier: `technical-monitoring`
- SAS Token avec permission **Write**

---

### 5️⃣ Uploader les CSV sur Azure Storage

**Destination**: `https://nerdsa.blob.core.windows.net/nerd-data/technical-monitoring/`

**Outils possibles**:
- Azure Storage Explorer (GUI)
- Azure CLI: `az storage blob upload`
- Python: `azure-storage-blob`
- PowerShell: `Set-AzStorageBlobContent`

**Exemple avec Azure CLI**:
```bash
az storage blob upload \
  --account-name nerdsa \
  --container-name nerd-data \
  --name technical-monitoring/fact_controller_daily_raw_20260112.csv \
  --file fact_controller_daily_raw_20260112.csv \
  --sas-token "YOUR_SAS_TOKEN"
```

---

### 6️⃣ Valider la qualité des données

Avant d'uploader, vérifiez:

✅ **Pas de NULL sur les clés primaires**
- `site_id` ne doit jamais être NULL
- `request_date` ne doit jamais être NULL

✅ **Cohérence des agrégations**
- Exemple: `total_requests >= cache_hit_requests` (si applicable)
- Pas de valeurs négatives

✅ **Volumétrie attendue**
- Documenter le nombre de lignes par table
- Exemple: fact_controller_daily → ~500K lignes/jour

✅ **Format des colonnes**
- `status_code`: integer (200, 404, 500, etc.)
- `cache_behavior`: texte ("HIT", "MISS", "MISS_AND_STORE", etc.)
- `request_date`: date (YYYY-MM-DD)

---

### 7️⃣ Automatiser le dépôt (optionnel)

**Fréquence suggérée**: quotidienne

**Options**:
- **Airflow**: Créer un DAG pour exécuter les requêtes et uploader les CSV
- **DBT**: Intégrer dans le pipeline DBT existant
- **Azure Data Factory**: Pipeline d'extraction et dépôt
- **Script Python/Shell**: Avec cron job

**Exemple de workflow Airflow**:
```python
from airflow import DAG
from airflow.operators.python import PythonOperator

def extract_and_upload():
    # 1. Connexion JDBC CCDW
    # 2. Exécution requêtes SQL
    # 3. Export CSV
    # 4. Upload Azure Storage
    pass

dag = DAG('nerd_daily_extract', schedule_interval='@daily')
task = PythonOperator(task_id='extract_upload', python_callable=extract_and_upload, dag=dag)
```

---

## 🔧 Dépannage

### Problème: Erreur JDBC "Driver class not found"
**Solution**: Vérifier que le driver JDBC CCDW est bien dans le CLASSPATH

### Problème: Timeout sur les requêtes
**Solution**: Les requêtes avec GROUP BY peuvent être longues. Augmenter le timeout JDBC ou exécuter par plage de dates
```sql
WHERE request_date BETWEEN '2026-01-01' AND '2026-01-31'
```

### Problème: Erreur d'upload Azure Storage "Forbidden"
**Solution**: Vérifier que la SAS Token a bien la permission **Write** et n'est pas expirée

### Problème: CSV trop volumineux
**Solution**: Compresser les CSV en .gz avant upload
```bash
gzip fact_controller_daily_raw_20260112.csv
```

---

## 📊 Volumétrie attendue (estimations)

| Table | Lignes/jour estimées | Taille CSV estimée |
|-------|----------------------|---------------------|
| dim_site | ~100 | < 10 KB |
| fact_controller_daily_raw | ~500K | ~50 MB |
| fact_site_daily_raw | ~50K | ~5 MB |
| fact_include_controller_daily_raw | ~200K | ~20 MB |
| fact_api_daily_raw | ~100K | ~10 MB |
| fact_api_resource_daily_raw | ~1M | ~100 MB |

**Total estimé**: ~200 MB/jour

---

## 📝 Checklist de livraison

- [ ] Clés JDBC reçues (Houssem)
- [ ] Clés Azure Storage Write reçues (Houssem)
- [ ] Requêtes SQL testées sur CCDW
- [ ] CSV générés avec nomenclature correcte
- [ ] Validation qualité des données (NULL, cohérence)
- [ ] Upload sur Azure Storage réussi
- [ ] Volumétrie documentée (nombre de lignes par table)
- [ ] Pipeline d'automatisation configuré (si applicable)

---

## 📞 Contacts

| Rôle | Nom | Email | Pour |
|------|-----|-------|------|
| DevOps | Houssem | [À compléter] | Clés JDBC, Clés Azure Storage |
| Lead Technique | [À compléter] | [À compléter] | Questions techniques SQL |
| Expert Power BI | [À compléter] | [À compléter] | Validation des CSV |

---

## 📚 Ressources

- **Requêtes SQL**: [`extractions_raw_CORRECTED.sql`](extractions_raw_CORRECTED.sql)
- **Document de livraison**: [`LIVRAISON_LOT1_LOT2.md`](LIVRAISON_LOT1_LOT2.md)
- **Salesforce JDBC Driver**: [Documentation officielle](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/b2c-intelligence-jdbc-driver.html)
- **Azure Storage CLI**: [Documentation Microsoft](https://docs.microsoft.com/en-us/cli/azure/storage/blob)

---

**Fin du document**

*Généré le 2026-01-12*
