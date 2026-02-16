# Power BI — Connexion via JDBC (avec R/Python)

Deux options supportées par Power BI Desktop: Script R (RJDBC) ou Script Python (jaydebeapi). Les secrets doivent être fournis via variables d’environnement.

## Pré-requis
- Java 64-bit (JDK 11+), `JAVA_HOME` et `%JAVA_HOME%\bin` dans `PATH`.
- JAR JDBC: `C:\DataDrivers\cip\cip-client-dataconnector-0.1.22.jar`
- Depuis la documentation JDBC du fournisseur, récupérer:
  - Driver class (ex: `com.vendor.cip.Driver`)
  - URL JDBC (ex: `jdbc:cip://host:port/database?ssl=true`)
- Variables d’environnement Windows (sans secrets dans le code):
  - `CIP_DB_USER`, `CIP_DB_PASSWORD`

## Option A — R Script (RJDBC)
1) Installer R 64-bit et packages:
```r
install.packages(c("DBI", "RJDBC"), repos = "https://cloud.r-project.org")
```
2) Power BI Desktop → Options → R Scripting: pointer vers R 64-bit.
3) Obtenir des données → Autre → Script R, coller:
```r
library(DBI)
library(RJDBC)

driver_class <- "REMPLIR: ex. com.vendor.cip.Driver"
jar_path     <- "C:\\DataDrivers\\cip\\cip-client-dataconnector-0.1.22.jar"
jdbc_url     <- "REMPLIR: ex. jdbc:cip://host:port/db?ssl=true"
db_user      <- Sys.getenv("CIP_DB_USER")
db_password  <- Sys.getenv("CIP_DB_PASSWORD")

drv  <- RJDBC::JDBC(driverClass = driver_class, classPath = jar_path, identifier.quote = "`")
conn <- dbConnect(drv, jdbc_url, db_user, db_password)
df   <- dbGetQuery(conn, "SELECT * FROM schema.table")  # adapter
dbDisconnect(conn)
df
```

## Option B — Python Script (jaydebeapi)
1) Environnement Python dédié:
```bash
python -m venv C:\venvs\pbi_jdbc
C:\venvs\pbi_jdbc\Scripts\pip install --upgrade pip
C:\venvs\pbi_jdbc\Scripts\pip install jaydebeapi JPype1 pandas
```
2) Power BI Desktop → Options → Python scripting: `C:\venvs\pbi_jdbc\Scripts\python.exe`
3) Obtenir des données → Autre → Script Python, coller:
```python
import os
import pandas as pd
import jaydebeapi

DRIVER_CLASS = "REMPLIR: ex. com.vendor.cip.Driver"
JAR_PATH     = r"C:\DataDrivers\cip\cip-client-dataconnector-0.1.22.jar"
JDBC_URL     = "REMPLIR: ex. jdbc:cip://host:port/db?ssl=true"

DB_USER = os.getenv("CIP_DB_USER")
DB_PASS = os.getenv("CIP_DB_PASSWORD")

conn = jaydebeapi.connect(DRIVER_CLASS, JDBC_URL, [DB_USER, DB_PASS], JAR_PATH)
df = pd.read_sql("SELECT * FROM schema.table", conn)  # adapter
conn.close()
```

## Rafraîchissement dans le Service
- Installer la Passerelle locale sur la machine d’exécution et y reproduire: Java, JAR, R/Python, libs.
- Conserver les mêmes chemins et variables d’environnement.
- Configurer l’actualisation planifiée dans Power BI Service via la passerelle.

## Dépannage
- Erreur driver class not found: vérifier `driver_class`/`DRIVER_CLASS` et chemin JAR.
- Erreur auth: secrets via env vars; pas de secrets en clair ni dans logs.
- SSL/Firewall: ajouter les paramètres de l’URL JDBC (ex: `ssl=true`) et ouvrir les flux requis.

