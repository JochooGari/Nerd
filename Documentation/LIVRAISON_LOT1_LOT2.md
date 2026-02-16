# Livraison LOT1 & LOT2 - NERD Dashboard

**Date**: 2026-01-12
**Destinataires**: Lead Technique, Elias Tanos (Data), Houssem (DevOps)

---

## 📦 Livrables

### ✅ 1. Documentation complète

**Fichier**: [`DOCUMENTATION_COMPLETE_NERD.md`](DOCUMENTATION_COMPLETE_NERD.md)

**Contenu**:
- Analyse complète du modèle de données Power BI (25 tables, 25 relations, 18 mesures DAX)
- Catalogue détaillé de toutes les tables avec types de données et descriptions
- Architecture en schéma étoile (dimensions + faits)
- Requêtes SQL brutes pour LOT2
- Guide de migration SharePoint → Azure pour LOT1
- Roadmap des évolutions possibles (court/moyen/long terme)
- Best practices et sécurité

---

### ✅ 2. Requêtes SQL brutes (LOT2)

**Fichier**: [`extractions_raw_CORRECTED.sql`](extractions_raw_CORRECTED.sql)
**Guide Power Query**: [`PowerQuery_Transformations.md`](PowerQuery_Transformations.md)

**Caractéristiques** (Version 3.0 - RAW DATA ONLY):
- ✅ **DONNÉES BRUTES uniquement** - Aucun CASE WHEN ni transformation conditionnelle
- ✅ **status_code et cache_behavior retournés tels quels** dans le GROUP BY
- ✅ **TOUTES les transformations se font en Power Query** (flags, calculs, agrégations)
- ✅ **Flexibilité maximale** - Changement des règles métier sans recharger les données
- ✅ **Indépendance de l'équipe Data** - Elias fournit les données telles quelles

**Tables couvertes**:
1. `ccdw_dim_site_aaqp_prd` → dim_site
2. `ccdw_aggr_controller_request_aaqp_prd` → fact_controller_daily + fact_site_daily
3. `ccdw_aggr_include_controller_request_aaqp_prd` → fact_include_controller_daily + fact_include_cache_daily + fact_cart_daily + fact_checkout_daily
4. `ccdw_aggr_scapi_request_aaqp_prd` → fact_api_daily + fact_api_resource_daily (partie SCAPI)
5. `ccdw_aggr_ocapi_request_aaqp_prd` → fact_api_daily + fact_api_resource_daily (partie OCAPI)
6. `ccdw_aggr_promotion_activation_aaqp_prd` → fact_promo_daily (activations)
7. `ccdw_fact_promotion_line_item_aaqp_prd` → fact_promo_daily (line items)

**Points clés**:
- Les **colonnes status_code et cache_behavior** sont incluses dans le GROUP BY SQL
- Les **transformations conditionnelles** (cache_hit_flag, error_flag) sont faites en Power Query
- Les **agrégations finales** (total_requests, cache_hit_requests, error_requests) sont faites en Power Query
- Les **colonnes calculées** (moyennes, taux, pourcentages) sont faites en Power Query
- Exemples : `avg_response_time_ms`, `cache_hit_rate`, `error_rate`
- **Avantage**: Changement des règles métier côté Azure/Power BI, pas besoin de recharger depuis CCDW

---

## 🎯 Actions requises par équipe

### 🔧 LOT1 - Migration SharePoint vers Azure Storage

**Responsable**: Houssem (DevOps)

#### Actions DevOps

1. **Créer un conteneur Blob dans Storage Account `nerdsa`**
   - Nom suggéré: `nerd-data`
   - Créer les sous-dossiers:
     - `/realms/` pour `realms.json`
     - `/ods/` pour `ods.json`
     - `/static/` pour `static.json` (si utilisé)

2. **Configurer les accès**
   - Générer une **SAS Token** ou configurer **Azure AD authentication**
   - Documenter les credentials (à transmettre à l'Expert Power BI via canal sécurisé)
   - Durée de vie SAS: 7 jours pour prod, 24h pour dev

3. **Migrer les fichiers existants**
   - Télécharger depuis SharePoint:
     ```
     https://loreal.sharepoint.com/:f:/r/sites/-FR-GLOBALD2CITTEAM/Documents%20partages/General/04.%20TRANSVERSAL%20PROJECTS/20.%20NERD%20-%20%20NGL%20Environments%20Reliability%20Dashboard/Data
     ```
   - Uploader vers Azure Blob:
     - `realms.json` → `https://nerdsa.blob.core.windows.net/nerd-data/realms/realms.json`
     - `ods.json` → `https://nerdsa.blob.core.windows.net/nerd-data/ods/ods.json`

4. **Automatiser le dépôt** (si collecte automatique)
   - Option A: Azure Function déclenchée par schedule (Function App `nerdmvp` déjà créée)
   - Option B: Script Node.js/Python avec cron job

#### Actions Expert Power BI

1. **Modifier les sources de données dans Power BI Desktop**
   - Ouvrir le fichier `Nerd.pbix`
   - Pour `Fact_Realms Daily` et `fact_ODS Daily`:
     - Ancien: `Web.Contents("https://loreal.sharepoint.com/...")`
     - Nouveau: `AzureStorage.Blobs("https://nerdsa.blob.core.windows.net/nerd-data")`

2. **Configurer l'authentification**
   - Utiliser les credentials fournis par Houssem (SAS Token ou Azure AD)
   - Tester la connexion en local (Power BI Desktop)

3. **Publier et configurer le refresh**
   - Publier le rapport sur Power BI Service
   - Configurer le refresh via la Gateway (installer sur serveur dédié si pas déjà fait)
   - Tester l'actualisation planifiée

#### Point de coordination LOT1

- **Date suggérée**: À planifier avec Houssem
- **Participants**: Houssem (DevOps) + Expert Power BI + Lead Technique
- **Ordre du jour**:
  1. Génération et transmission des clés Azure Storage
  2. Configuration Power BI (live coding)
  3. Tests de connectivité
  4. Validation refresh planifié

---

### 📊 LOT2 - Livraison requêtes SQL et clés d'accès

**Responsable Data**: Elias Tanos (elias.tanios@loreal.com)
**Responsable Accès**: Houssem (DevOps)

#### Actions Data Engineer (Elias)

1. **✅ Requêtes SQL reçues**
   - Fichier: `extractions_raw_CORRECTED.sql`
   - 7 tables sources CCDW couvertes
   - Format: SUM + GROUP BY uniquement (pas de règles métier)

2. **Exécuter les requêtes sur le DWH CCDW**
   - Utiliser les requêtes du fichier SQL
   - Exporter les résultats en CSV (ou format préféré)

3. **Déposer les CSV sur Azure Storage Account**
   - Conteneur: `nerd-data/technical-monitoring/`
   - Nomenclature suggérée:
     - `dim_site_YYYYMMDD.csv`
     - `fact_controller_daily_YYYYMMDD.csv`
     - `fact_site_daily_YYYYMMDD.csv`
     - etc.
   - Fréquence: quotidienne (automatiser via pipeline Airflow/DBT/ADO)

4. **Valider la qualité des données**
   - Vérifier l'absence de valeurs NULL sur les clés primaires
   - Contraintes de cohérence (ex: `total_requests >= cache_hit_requests`)
   - Documenter les volumétries (nombre de lignes par table)

#### Actions DevOps (Houssem)

1. **Fournir les clés d'accès JDBC à Elias**
   - Driver: B2C Commerce Intelligence JDBC Driver
   - Connection string CCDW
   - Credentials (username/password ou certificat)
   - Transmettre via canal sécurisé (Azure Key Vault, 1Password, etc.)

2. **Whitelist des IP** (si nécessaire)
   - Ajouter les IP du serveur d'Elias pour accès au DWH CCDW

3. **Fournir les accès Azure Storage à Elias**
   - Credentials pour uploader les CSV sur `nerdsa` (SAS Token Write)

#### Point de coordination LOT2

- **Date**: À planifier entre Houssem et Elias
- **Objectif**: Transmission sécurisée des clés d'accès
- **Livrables**:
  - ✅ Requêtes SQL (déjà livrées)
  - ⏳ Clés JDBC (Houssem → Elias)
  - ⏳ Clés Azure Storage Write (Houssem → Elias)

---

## 📋 Nouvelle approche: Données brutes + Transformations Power Query

### ⚠️ Changement important (Version 3.0)

Les requêtes SQL retournent maintenant les **données BRUTES** sans transformation conditionnelle.

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

**Transformations Power Query**:
```m
// 1. Ajouter flags
cache_hit_flag = if Text.Upper([cache_behavior]) = "HIT" then 1 else 0
error_flag = if Text.Start(Text.From([status_code]), 1) = "4" or
                Text.Start(Text.From([status_code]), 1) = "5" then 1 else 0

// 2. Calculer colonnes intermédiaires
cache_hit_requests = [num_requests] * [cache_hit_flag]
error_requests = [num_requests] * [error_flag]

// 3. Agréger
Table.Group({"site_id","request_date","controller_name"}, {
  {"total_requests", each List.Sum([num_requests])},
  {"cache_hit_requests", each List.Sum([cache_hit_requests])},
  {"error_requests", each List.Sum([error_requests])}
})
```

### Avantages de cette approche

✅ **Flexibilité maximale**: Changement des règles métier (ex: définition d'une erreur) sans recharger depuis CCDW
✅ **Indépendance de l'équipe Data**: Elias fournit les données telles quelles, pas de règles métier à gérer
✅ **Versioning Power Query**: Les transformations sont versionnées dans le modèle Power BI
✅ **Performance optimisée**: Agrégations SQL (réduction volumétrie) + transformations M (flexibilité)
✅ **Maintenance simplifiée**: Modifier une règle = modifier le code M, pas besoin de nouveau CSV

### Exemple complet: fact_controller_daily

Voir [`PowerQuery_Transformations.md`](PowerQuery_Transformations.md) pour le code M détaillé de toutes les tables

---

## 🚀 Évolutions possibles (résumé)

Voir [`DOCUMENTATION_COMPLETE_NERD.md`](DOCUMENTATION_COMPLETE_NERD.md) section 10 pour les détails complets.

### Court terme (3-6 mois)
- Monitoring ODS par équipe/projet (chargeback)
- Prédiction de fin de crédits
- Alertes de performance (threshold sur temps réponse)
- Analyse des erreurs (drill-down par status_code)
- Monitoring des versions NGL (% realms à jour)

### Moyen terme (6-12 mois)
- Parsing logs SFCC (quotas, deprecations)
- KPI business (conversion, revenue)
- Multi-realm benchmarking
- Best practices scoring

### Long terme (12+ mois)
- Machine Learning (prédiction charge, anomaly detection)
- Intégration CI/CD (tracking déploiements)
- Système d'alertes avancé (Teams, ServiceNow)
- Incident correlation

---

## 📚 Ressources

### Documentation
- **Documentation complète**: [`DOCUMENTATION_COMPLETE_NERD.md`](DOCUMENTATION_COMPLETE_NERD.md)
- **Requêtes SQL**: [`extractions_raw_CORRECTED.sql`](../extractions_raw_CORRECTED.sql)
- **Connexion JDBC Power BI**: [`PowerBI_JDBC_Connection.md`](PowerBI_JDBC_Connection.md)
- **Sécurité**: [`Security_and_Quality_Guidelines.md`](Security_and_Quality_Guidelines.md)

### Azure
- [Storage Account nerdsa](https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Storage/storageAccounts/nerdsa/overview)
- [Function App nerdmvp](https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Web/sites/nerdmvp/users)

### Salesforce
- [B2C Intelligence JDBC Driver](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/b2c-intelligence-jdbc-driver.html)
- [Data Lakehouse Schema](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/data-lakehouse-schema-reference.html)

---

## ✅ Checklist de validation

### LOT1 - Migration Azure
- [ ] Conteneur Blob créé dans `nerdsa`
- [ ] Clés d'accès générées (SAS Token ou Azure AD)
- [ ] Fichiers JSON migrés vers Azure Blob
- [ ] Power BI reconfiguré pour pointer vers Azure
- [ ] Tests de connectivité réussis
- [ ] Refresh planifié configuré et testé

### LOT2 - Livraison Data
- [x] Requêtes SQL livrées à Elias
- [ ] Clés JDBC transmises à Elias (par Houssem)
- [ ] Clés Azure Storage Write transmises à Elias (par Houssem)
- [ ] CSV générés par Elias et uploadés sur Azure
- [ ] Power BI connecté aux CSV (ou JDBC direct)
- [ ] Validation qualité des données
- [ ] Pipeline d'actualisation automatisé

---

## 📞 Contacts

| Rôle | Nom | Email |
|------|-----|-------|
| Lead Technique | [À remplir] | [À remplir] |
| Data Engineer | Elias Tanos | elias.tanios@loreal.com |
| DevOps | Houssem | [À remplir] |
| Expert Power BI | [À remplir] | [À remplir] |

---

**Fin du document**

*Généré le 2026-01-12*
