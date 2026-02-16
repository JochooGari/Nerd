# Next Steps (Data Eng & Power BI)

## Data Engineering
- Mettre en place les extractions brutes DWH selon `extractions_raw.sql` (adapter schémas `raw`/`staging`).
- Versionner les scripts et assurer l’ordonnancement (Airflow/DBT/ADO pipes).
- Ajouter si besoin la table recommandations produits (voir Raw_Extractions_SQL.md).
- Documenter les SLA/latences/volumétries et surveiller la qualité des données.

## Power BI
- Valider la connexion JDBC (R ou Python) avec le JAR fournisseur; paramétrer la Passerelle.
- Cartographier les champs aux visuels, et vérifier les mesures DAX s’il y en a.
- Aligner la sécurité (Row-Level Security si requis) et les refresh schedules.

## Gouvernance
- Mettre à jour ce dossier `Documentation` à chaque évolution de modèle ou de flux.
- Respecter les règles sécurité/qualité (voir `Security_and_Quality_Guidelines.md`). 

