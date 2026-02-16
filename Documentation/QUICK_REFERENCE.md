# Quick Reference - Commandes et exemples pratiques

**Date**: 2026-01-12

---

## 🔧 Pour Elias (Data Engineer)

### Connexion JDBC CCDW
```python
import jaydebeapi

DRIVER_CLASS = "com.salesforce.cip.Driver"  # Exemple, à confirmer
JAR_PATH = "/path/to/cip-client-dataconnector.jar"
JDBC_URL = "jdbc:cip://host:port/database?ssl=true"  # À confirmer avec Houssem
USERNAME = os.getenv("CCDW_USERNAME")
PASSWORD = os.getenv("CCDW_PASSWORD")

conn = jaydebeapi.connect(DRIVER_CLASS, JDBC_URL, [USERNAME, PASSWORD], JAR_PATH)
```

### Exécution d'une requête SQL
```python
import pandas as pd

query = """
SELECT site_id, request_date, controller_name, cache_behavior, status_code,
       SUM(num_requests) AS num_requests, SUM(response_time) AS response_time_ms
FROM ccdw_aggr_controller_request_aaqp_prd
WHERE request_date BETWEEN '2026-01-01' AND '2026-01-12'
GROUP BY site_id, request_date, controller_name, cache_behavior, status_code
"""

df = pd.read_sql(query, conn)
print(f"Lignes retournées: {len(df)}")
```

### Export CSV
```python
from datetime import datetime

date_str = datetime.now().strftime("%Y%m%d")
filename = f"fact_controller_daily_raw_{date_str}.csv"

df.to_csv(filename, index=False, encoding='utf-8')
print(f"CSV créé: {filename} ({len(df)} lignes)")
```

### Upload sur Azure Storage
```python
from azure.storage.blob import BlobServiceClient

account_url = "https://nerdsa.blob.core.windows.net"
sas_token = os.getenv("AZURE_SAS_TOKEN")  # Fourni par Houssem

blob_service = BlobServiceClient(account_url=account_url, credential=sas_token)
container_client = blob_service.get_container_client("nerd-data")

blob_path = f"technical-monitoring/{filename}"
with open(filename, "rb") as data:
    container_client.upload_blob(name=blob_path, data=data, overwrite=True)
print(f"Uploadé: {blob_path}")
```

### Azure CLI (alternative)
```bash
# Upload d'un seul fichier
az storage blob upload \
  --account-name nerdsa \
  --container-name nerd-data \
  --name technical-monitoring/fact_controller_daily_raw_20260112.csv \
  --file fact_controller_daily_raw_20260112.csv \
  --sas-token "sp=racwdl&st=..."

# Upload d'un dossier complet
az storage blob upload-batch \
  --account-name nerdsa \
  --destination nerd-data/technical-monitoring \
  --source ./csv_output/ \
  --sas-token "sp=racwdl&st=..."
```

---

## 💻 Pour Expert Power BI

### Connexion Azure Blob Storage (Power Query M)
```m
let
    Source = AzureStorage.Blobs("https://nerdsa.blob.core.windows.net/nerd-data"),
    FilteredRows = Table.SelectRows(Source, each
        Text.StartsWith([Name], "technical-monitoring/fact_controller_daily_raw_")),
    LatestFile = Table.Last(Table.Sort(FilteredRows, {{"Date modified", Order.Descending}})),
    Content = Csv.Document(LatestFile[Content], [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv])
in
    Content
```

### Transformation complète (exemple fact_controller_daily)
```m
let
    // 1. Charger CSV depuis Azure Blob
    Source = Csv.Document(File.Contents("fact_controller_daily_raw_20260112.csv"),
                          [Delimiter=",", Encoding=65001]),

    // 2. Promouvoir les headers et typer
    PromoteHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromoteHeaders, {
        {"site_id", type text},
        {"request_date", type date},
        {"controller_name", type text},
        {"cache_behavior", type text},
        {"status_code", Int64.Type},
        {"num_requests", Int64.Type},
        {"response_time_ms", Int64.Type}
    }),

    // 3. Ajouter cache_hit_flag
    AddCacheHitFlag = Table.AddColumn(TypedTable, "cache_hit_flag", each
        if Text.Upper([cache_behavior]) = "HIT" then 1 else 0, Int64.Type),

    // 4. Ajouter error_flag
    AddErrorFlag = Table.AddColumn(AddCacheHitFlag, "error_flag", each
        if Text.Start(Text.From([status_code]), 1) = "4" or
           Text.Start(Text.From([status_code]), 1) = "5"
        then 1 else 0, Int64.Type),

    // 5. Calculer colonnes intermédiaires
    AddCacheHitRequests = Table.AddColumn(AddErrorFlag, "cache_hit_requests", each
        [num_requests] * [cache_hit_flag], Int64.Type),
    AddErrorRequests = Table.AddColumn(AddCacheHitRequests, "error_requests", each
        [num_requests] * [error_flag], Int64.Type),

    // 6. Agréger
    GroupedTable = Table.Group(AddErrorRequests,
        {"site_id", "request_date", "controller_name"}, {
        {"total_requests", each List.Sum([num_requests]), Int64.Type},
        {"total_response_time_ms", each List.Sum([response_time_ms]), Int64.Type},
        {"cache_hit_requests", each List.Sum([cache_hit_requests]), Int64.Type},
        {"error_requests", each List.Sum([error_requests]), Int64.Type}
    }),

    // 7. Ajouter moyennes et taux
    AddAvgResponseTime = Table.AddColumn(GroupedTable, "avg_response_time_ms", each
        if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null, type number),
    AddCacheHitRate = Table.AddColumn(AddAvgResponseTime, "cache_hit_rate", each
        if [total_requests] > 0 then [cache_hit_requests] / [total_requests] else null, type number)
in
    AddCacheHitRate
```

### Validation DAX (mesures)
```dax
// Vérifier la cohérence des agrégations
Total Requests Check =
VAR CacheHit = SUM(fact_controller_daily[cache_hit_requests])
VAR Errors = SUM(fact_controller_daily[error_requests])
VAR Total = SUM(fact_controller_daily[total_requests])
RETURN
IF(
    CacheHit <= Total && Errors <= Total,
    "OK",
    "ERREUR: Incohérence dans les agrégations"
)
```

---

## ☁️ Pour Houssem (DevOps)

### Créer un conteneur Blob
```bash
az storage container create \
  --name nerd-data \
  --account-name nerdsa \
  --resource-group NE-GBT-RG-NERD \
  --public-access off
```

### Créer des dossiers virtuels
```bash
# Créer un fichier .keep dans chaque dossier
echo "" > .keep

# Upload pour créer les dossiers
az storage blob upload --account-name nerdsa --container-name nerd-data \
  --name realms/.keep --file .keep
az storage blob upload --account-name nerdsa --container-name nerd-data \
  --name ods/.keep --file .keep
az storage blob upload --account-name nerdsa --container-name nerd-data \
  --name technical-monitoring/.keep --file .keep
```

### Générer une SAS Token (Write pour Elias)
```bash
# Expiration dans 7 jours, permissions Write
az storage container generate-sas \
  --account-name nerdsa \
  --name nerd-data \
  --permissions racwdl \
  --expiry $(date -u -d "7 days" '+%Y-%m-%dT%H:%MZ') \
  --auth-mode key \
  --output tsv
```

### Générer une SAS Token (Read pour Power BI)
```bash
# Expiration dans 1 an, permissions Read
az storage container generate-sas \
  --account-name nerdsa \
  --name nerd-data \
  --permissions rl \
  --expiry $(date -u -d "1 year" '+%Y-%m-%dT%H:%MZ') \
  --auth-mode key \
  --output tsv
```

### Migrer fichiers SharePoint → Azure
```bash
# 1. Télécharger depuis SharePoint (manuellement ou via script)
# 2. Upload vers Azure
az storage blob upload-batch \
  --account-name nerdsa \
  --destination nerd-data/realms \
  --source ./sharepoint_download/realms/ \
  --pattern "*.json"

az storage blob upload-batch \
  --account-name nerdsa \
  --destination nerd-data/ods \
  --source ./sharepoint_download/ods/ \
  --pattern "*.json"
```

### Lister les blobs
```bash
az storage blob list \
  --account-name nerdsa \
  --container-name nerd-data \
  --prefix technical-monitoring/ \
  --output table
```

---

## 🔍 Pour Lead Technique (Validation)

### Vérifier la connectivité JDBC (Python)
```python
import jaydebeapi

try:
    conn = jaydebeapi.connect(DRIVER_CLASS, JDBC_URL, [USERNAME, PASSWORD], JAR_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    result = cursor.fetchone()
    print(f"✅ Connexion JDBC OK: {result}")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Erreur JDBC: {e}")
```

### Vérifier l'upload Azure Storage (Azure CLI)
```bash
# Vérifier si le fichier existe
az storage blob exists \
  --account-name nerdsa \
  --container-name nerd-data \
  --name technical-monitoring/fact_controller_daily_raw_20260112.csv \
  --output table

# Télécharger pour validation
az storage blob download \
  --account-name nerdsa \
  --container-name nerd-data \
  --name technical-monitoring/fact_controller_daily_raw_20260112.csv \
  --file validation_download.csv
```

### Compter les lignes d'un CSV (Bash)
```bash
wc -l fact_controller_daily_raw_20260112.csv
# Sortie exemple: 523847 fact_controller_daily_raw_20260112.csv
```

### Vérifier les colonnes (Python)
```python
import pandas as pd

df = pd.read_csv("fact_controller_daily_raw_20260112.csv")
print(f"Colonnes: {list(df.columns)}")
print(f"Lignes: {len(df)}")
print(f"Valeurs NULL par colonne:\n{df.isnull().sum()}")
print(f"Types de données:\n{df.dtypes}")
```

### Valider la cohérence (SQL-like query avec pandas)
```python
# Vérifier que les agrégations sont cohérentes
grouped = df.groupby(['site_id', 'request_date', 'controller_name']).agg({
    'num_requests': 'sum',
    'response_time_ms': 'sum'
})
print(f"Groupes uniques: {len(grouped)}")
print(f"Total requests: {grouped['num_requests'].sum()}")
```

---

## 📊 Volumétrie et performance

### Estimer la taille des CSV
```python
import os

def estimate_csv_size(num_rows, num_cols, avg_col_size=10):
    """
    num_rows: nombre de lignes
    num_cols: nombre de colonnes
    avg_col_size: taille moyenne d'une cellule en bytes
    """
    size_bytes = num_rows * num_cols * avg_col_size
    size_mb = size_bytes / (1024 * 1024)
    return size_mb

# Exemple: fact_controller_daily_raw
print(f"Taille estimée: {estimate_csv_size(500000, 7):.2f} MB")
```

### Compresser les CSV avant upload (optionnel)
```bash
# Compression gzip
gzip fact_controller_daily_raw_20260112.csv

# Upload du fichier compressé
az storage blob upload \
  --account-name nerdsa \
  --container-name nerd-data \
  --name technical-monitoring/fact_controller_daily_raw_20260112.csv.gz \
  --file fact_controller_daily_raw_20260112.csv.gz
```

---

## 🚨 Dépannage rapide

### Erreur: "JDBC Driver class not found"
```bash
# Vérifier le chemin du JAR
ls -lh /path/to/cip-client-dataconnector.jar

# Vérifier le CLASSPATH
echo $CLASSPATH
```

### Erreur: "Azure Storage Forbidden"
```bash
# Vérifier les permissions de la SAS Token
# La SAS doit avoir au minimum: r (read), w (write), l (list)
# Vérifier la date d'expiration
```

### Erreur: "Power Query - Expression.Error"
```m
// Ajouter gestion d'erreur
= try AddCacheHitFlag otherwise null
```

### Erreur: Division par zéro en Power Query
```m
// Toujours vérifier avant de diviser
if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null
```

---

**Fin du document**

*Généré le 2026-01-12*
