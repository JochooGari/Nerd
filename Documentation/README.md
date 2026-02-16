# Documentation NERD Dashboard

Ce dossier regroupe toute la documentation pour les équipes Data, DevOps et Power BI concernant le dashboard NERD (NGL Environments Reliability Dashboard).

---

## 📦 Documents de livraison LOT1 & LOT2

### Document principal
- **[LIVRAISON_LOT1_LOT2.md](LIVRAISON_LOT1_LOT2.md)** - Document de livraison complet avec checklist et actions par équipe

### Actions par rôle
- **[ACTIONS_ELIAS_DATA.md](ACTIONS_ELIAS_DATA.md)** - Guide pour Elias Tanos (Data Engineer) : exécution des requêtes SQL et upload sur Azure
- **[ACTIONS_POWERBI_EXPERT.md](ACTIONS_POWERBI_EXPERT.md)** - Guide pour l'Expert Power BI : transformations Power Query à appliquer

---

## 🗂️ Documentation technique

### Architecture et modèle de données
- **[DOCUMENTATION_COMPLETE_NERD.md](DOCUMENTATION_COMPLETE_NERD.md)** - Documentation complète du modèle Power BI (25 tables, 25 relations, 18 mesures)
- **[Data_Model_Overview.md](Data_Model_Overview.md)** - Vue d'ensemble du modèle étoile (dimensions + faits)

### Requêtes et transformations
- **[extractions_raw_CORRECTED.sql](extractions_raw_CORRECTED.sql)** - Requêtes SQL brutes (Version 3.0 - RAW DATA ONLY)
- **[PowerQuery_Transformations.md](PowerQuery_Transformations.md)** - Guide complet des transformations Power Query M à appliquer

### Connexion et sécurité
- **[PowerBI_JDBC_Connection.md](PowerBI_JDBC_Connection.md)** - Guide de connexion Power BI via JDBC (R/Python)
- **[Security_and_Quality_Guidelines.md](Security_and_Quality_Guidelines.md)** - Bonnes pratiques de sécurité et qualité

### Historique
- **[Changelog.md](Changelog.md)** - Historique des versions et décisions techniques
- **[Next_Steps.md](Next_Steps.md)** - Évolutions possibles (court/moyen/long terme)

---

## ⚠️ Changement important - Version 3.0 (RAW DATA ONLY)

### Nouvelle approche

Les requêtes SQL retournent maintenant les **données BRUTES** (status_code, cache_behavior) sans transformation conditionnelle.

**Avant (Version 2.0)**:
```sql
-- SQL calculait cache_hit_requests et error_requests
SUM(CASE WHEN UPPER(cache_behavior) = 'HIT' THEN num_requests ELSE 0 END) AS cache_hit_requests
```

**Maintenant (Version 3.0)**:
```sql
-- SQL retourne cache_behavior et status_code bruts
SELECT site_id, request_date, controller_name, cache_behavior, status_code,
       SUM(num_requests) AS num_requests, SUM(response_time) AS response_time_ms
FROM ccdw_aggr_controller_request_aaqp_prd
GROUP BY site_id, request_date, controller_name, cache_behavior, status_code;
```

**Transformations Power Query** (ajout de flags, agrégation, calcul de moyennes):
```m
cache_hit_flag = if Text.Upper([cache_behavior]) = "HIT" then 1 else 0
error_flag = if Text.Start(Text.From([status_code]), 1) = "4" or
                Text.Start(Text.From([status_code]), 1) = "5" then 1 else 0
```

### Avantages

✅ **Flexibilité maximale**: Changement des règles métier sans recharger les données depuis CCDW
✅ **Indépendance de l'équipe Data**: Elias fournit les données telles quelles
✅ **Versioning Power Query**: Les transformations sont versionnées dans le modèle Power BI
✅ **Performance optimisée**: Agrégations SQL + transformations M

---

## 🎯 Par où commencer?

### Vous êtes Data Engineer (Elias)
1. Lire [ACTIONS_ELIAS_DATA.md](ACTIONS_ELIAS_DATA.md)
2. Récupérer les clés JDBC auprès de Houssem
3. Exécuter les requêtes dans [extractions_raw_CORRECTED.sql](extractions_raw_CORRECTED.sql)
4. Uploader les CSV sur Azure Storage

### Vous êtes Expert Power BI
1. Lire [ACTIONS_POWERBI_EXPERT.md](ACTIONS_POWERBI_EXPERT.md)
2. Consulter [PowerQuery_Transformations.md](PowerQuery_Transformations.md)
3. Appliquer les transformations M pour chaque table
4. Valider les résultats

### Vous êtes DevOps (Houssem)
1. Lire [LIVRAISON_LOT1_LOT2.md](LIVRAISON_LOT1_LOT2.md)
2. Section LOT1: Migration SharePoint → Azure Storage (realms.json, ods.json)
3. Section LOT2: Fournir clés JDBC et Azure Storage à Elias

### Vous êtes Lead Technique
1. Lire [LIVRAISON_LOT1_LOT2.md](LIVRAISON_LOT1_LOT2.md)
2. Consulter [DOCUMENTATION_COMPLETE_NERD.md](DOCUMENTATION_COMPLETE_NERD.md)
3. Coordonner les actions entre équipes

---

## 📞 Contacts

| Rôle | Nom | Email |
|------|-----|-------|
| Data Engineer | Elias Tanos | elias.tanios@loreal.com |
| DevOps | Houssem | [À compléter] |
| Expert Power BI | [À compléter] | [À compléter] |
| Lead Technique | [À compléter] | [À compléter] |

---

## 🔗 Ressources externes

- [Salesforce B2C Intelligence JDBC Driver](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/b2c-intelligence-jdbc-driver.html)
- [Data Lakehouse Schema Reference](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/data-lakehouse-schema-reference.html)
- [Azure Storage Account nerdsa](https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Storage/storageAccounts/nerdsa/overview)
- [Function App nerdmvp](https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Web/sites/nerdmvp/users)

---

**Dernière mise à jour**: 2026-01-12 (Version 3.0)
