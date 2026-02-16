# Documentation Complète - NERD Dashboard (NGL Environments Reliability Dashboard)

**Date de génération**: 2026-01-12
**Version**: 1.0
**Contacts**:
- Lead Technique: [À remplir]
- Expert Power BI: [À remplir]
- Data Engineer (Elias Tanos): elias.tanios@loreal.com

---

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Architecture du modèle de données](#2-architecture-du-modèle-de-données)
3. [Catalogue des tables](#3-catalogue-des-tables)
4. [Mesures DAX](#4-mesures-dax)
5. [Relations entre tables](#5-relations-entre-tables)
6. [Sources de données](#6-sources-de-données)
7. [Requêtes SQL brutes (sans règles métier)](#7-requêtes-sql-brutes-sans-règles-métier)
8. [LOT1: Migration SharePoint vers Azure Storage](#8-lot1-migration-sharepoint-vers-azure-storage)
9. [LOT2: Livraison des requêtes SQL et clés d'accès](#9-lot2-livraison-des-requêtes-sql-et-clés-daccès)
10. [Évolutions possibles](#10-évolutions-possibles)
11. [Best Practices et Sécurité](#11-best-practices-et-sécurité)

---

## 1. Vue d'ensemble du projet

### 1.1 Objectif

Le projet NERD (NGL Environments Reliability Dashboard) a pour objectif de fournir un cockpit technique permettant de "prendre le pouls" de tous les realms Salesforce B2C Commerce Cloud (SFCC) de L'Oréal dans le monde entier.

Le dashboard affiche un ensemble de KPI (Key Performance Indicators) pour détecter et monitorer toute déviation des opérations standard :
- Dépassements de quotas
- Baisses de performance côté serveur
- Consommation des crédits ODS (On-Demand Sandbox)
- Monitoring technique des contrôleurs, API, promotions

### 1.2 Périmètre actuel

**Realms couverts** (13 realms L'Oréal):
- **AMER**: aafm, aang, aatl, bjrm, bldd
- **EMEA**: aaqp, bhhx
- **Global**: bdcr
- **NA-SAPMENA**: aarm, aawh, bckq, bgsj, bfzm

**Sources de données**:
1. **ODS API** (On-Demand Sandbox): données JSON stockées sur SharePoint
2. **SFCC JDBC Driver** (via CCAC): données techniques agrégées depuis les tables CCDW

---

## 2. Architecture du modèle de données

### 2.1 Schéma conceptuel

Le modèle suit une architecture **en étoile (star schema)** avec:

**Dimensions principales**:
- `dim_Date`: dimension temporelle (jour, mois, trimestre, année, semaine ISO)
- `dim_Realm`: dimension des realms (zone, région, pays, ville)
- `dim_site`: dimension des sites SFCC (site_id, display_name, realm)
- `dim_ngl_release_calendar`: calendrier des releases NGL
- `dim_ngl_version_score`: scoring des versions NGL

**Tables de faits**:

**LOT1 - ODS & Realm Management**:
- `Fact_Realms Daily`: données quotidiennes par realm (promotions, coupons, sites, version NGL)
- `fact_ODS Daily`: consommation quotidienne des crédits ODS
- `fact_ODS Minutes By Profile`: minutes d'utilisation par profil ODS (medium, large, xlarge)
- `fact_Realm`: copie/snapshot des données realm

**LOT2 - Technical Monitoring (SFCC JDBC)**:
- `fact_controller_daily`: agrégations journalières par contrôleur
- `fact_site_daily`: agrégations journalières par site
- `fact_include_controller_daily`: inclusions de contrôleurs dans d'autres contrôleurs
- `fact_include_cache_daily`: statistiques de cache pour les inclusions
- `fact_api_daily OCAPI + SCAPI`: agrégations API par famille
- `fact_api_resource_daily`: détails par ressource API (buckets de latence)
- `fact_promo_daily`: activations promotions quotidiennes
- `fact_promo_perf`: performance promotions (cart + checkout)
- `fact_promo_perf_simulation`: simulation d'impact promotions
- `fact_cart_daily`: temps de réponse panier
- `fact_checkout_daily`: temps de réponse checkout

**Tables utilitaires**:
- `0 Measures`: table conteneur pour les mesures DAX principales
- `0 Mesure technical monitoring`: mesures DAX pour monitoring technique
- `Slicer period`: sélecteur de période
- `demo_up_to_date_environnements`: demo score environnements à jour
- `demo_Practices`: demo best practices

---

## 3. Catalogue des tables

### 3.1 Dimensions

#### `dim_Date`
| Colonne | Type | Description |
|---------|------|-------------|
| Date | DateTime | Clé primaire - Date calendaire |
| Year | Int64 | Année |
| MonthNo | Int64 | Numéro du mois (1-12) |
| Month | String | Nom du mois |
| Quarter | String | Trimestre (Q1, Q2, Q3, Q4) |
| ISO Week | Int64 | Semaine ISO |
| Start Week | DateTime | Date de début de semaine |
| rank month year | Int64 (calculé) | Rang du mois-année |
| month year | String (calculé) | Format "Mois Année" |
| week start | String (calculé) | Début de semaine formaté |

#### `dim_Realm`
| Colonne | Type | Description |
|---------|------|-------------|
| realm_id | String | Identifiant unique du realm (ex: bdcr, aaqp) |
| zone | String | Zone L'Oréal (amer, emea, global, na-sapmena) |
| region | String | Région AWS (ex: eu-west) |
| country | String | Pays (ex: Ireland) |
| city | String | Ville (ex: Dublin) |

#### `dim_site`
| Colonne | Type | Description |
|---------|------|-------------|
| site_id | Double | Identifiant numérique du site |
| site_description | String | Description du site |
| nsite_id | String | Site ID nominal |
| site_display_name | String | Nom d'affichage du site |
| nrealm_id | String | Realm ID associé |

**Source**: `ccdw_dim_site_aaqp_prd`

---

### 3.2 Tables de faits - ODS & Realm

#### `Fact_Realms Daily`
**Fréquence**: Quotidienne
**Granularité**: realm_id + date

| Colonne | Type | Description |
|---------|------|-------------|
| realm_id | String | Identifiant realm |
| date | DateTime | Date de capture |
| zone | String | Zone L'Oréal |
| region | String | Région cloud |
| country | String | Pays |
| city | String | Ville |
| compatibility_mode | String | Mode de compatibilité SFCC (ex: 22.7) |
| cartridges | String | Liste des cartridges JSON |
| ngl_version | String | Version NGLora (ex: 77.4.0) |
| nb_sites | Int64 | Nombre de sites sur le realm |
| sites | String | Liste des sites JSON |
| quotas | String | JSON contenant les quotas |
| nb_promotions | Int64 | Nombre total de promotions |
| nb_active_promotions | Int64 | Nombre de promotions actives |
| nb_coupons | Int64 | Nombre total de coupons |
| nb_active_coupons | Int64 | Nombre de coupons actifs |

**Source**: Fichier JSON `realms.json` stocké sur SharePoint (actuellement) → à migrer vers Azure Storage Account

---

#### `fact_ODS Daily`
**Fréquence**: Quotidienne
**Granularité**: realm_id + date

| Colonne | Type | Description |
|---------|------|-------------|
| realm_id | String | Identifiant realm |
| date | DateTime | Date de consommation |
| limits_enabled | Boolean | Limites ODS activées |
| max_nb_ods | Int64 | Nombre max d'ODS autorisé |
| total_minutes_up | Int64 | Minutes totales actives |
| total_minutes_down | Int64 | Minutes totales inactives |
| credits_up | Int64 | Crédits consommés (actifs) |
| credits_down | Double | Crédits économisés (inactifs) |
| minutes_up_by_profile.xlarge | Int64 | Minutes xlarge |
| minutes_up_by_profile.large | Int64 | Minutes large |
| minutes_up_by_profile.medium | Int64 | Minutes medium |

**Source**: Fichier JSON `ods.json` stocké sur SharePoint → à migrer vers Azure Storage Account

**Note**: Contrat actuel = 950,7 millions de crédits (février 2024 - février 2027)

---

#### `fact_ODS Minutes By Profile`
**Fréquence**: Quotidienne
**Granularité**: realm_id + date + profile

| Colonne | Type | Description |
|---------|------|-------------|
| realm_id | String | Identifiant realm |
| date | DateTime | Date |
| profile | String | Profil ODS (medium, large, xlarge) |
| minutes_up | Int64 | Minutes d'utilisation |

**Transformation**: Unpivot de `fact_ODS Daily`

---

### 3.3 Tables de faits - Technical Monitoring (JDBC)

#### `fact_controller_daily`
**Fréquence**: Quotidienne
**Granularité**: site_id + request_date + controller_name

| Colonne | Type | Description | Règle de calcul |
|---------|------|-------------|-----------------|
| site_id | Double | ID du site | - |
| request_date | DateTime | Date de la requête | - |
| controller_name | String | Nom du contrôleur | - |
| total_requests | Double | Total requêtes | **SUM(num_requests)** |
| total_response_time_ms | Double | Temps réponse total (ms) | **SUM(response_time)** |
| cache_hit_requests | Double | Requêtes avec cache hit | **SUM(num_requests WHERE cache_behavior='hit')** |
| error_requests | Double | Requêtes en erreur | **SUM(num_requests WHERE status_code >= 400)** |
| avg_response_time_ms | Double | Temps réponse moyen | **total_response_time_ms / total_requests** |
| cache_hit_rate | Double | Taux de cache hit | **cache_hit_requests / total_requests** |

**Source brute**: `ccdw_aggr_controller_request_aaqp_prd`

---

#### `fact_site_daily`
**Fréquence**: Quotidienne
**Granularité**: site_id + request_date

| Colonne | Type | Description | Règle de calcul |
|---------|------|-------------|-----------------|
| site_id | Double | ID du site | - |
| request_date | DateTime | Date | - |
| total_requests | Double | Total requêtes | **SUM(num_requests) GROUP BY site_id, date** |
| total_response_time_ms | Double | Temps réponse total | **SUM(response_time) GROUP BY site_id, date** |
| cache_hit_requests | Double | Requêtes cache hit | **SUM(num_requests WHERE cache='hit') GROUP BY site_id, date** |
| error_requests | Double | Requêtes erreur | **SUM(num_requests WHERE status>=400) GROUP BY site_id, date** |
| avg_response_time_ms | Double | Temps moyen | **total_response_time_ms / total_requests** |
| cache_hit_rate | Double | Taux cache | **cache_hit_requests / total_requests** |
| error_rate | Double | Taux erreur | **error_requests / total_requests** |

**Source brute**: `ccdw_aggr_controller_request_aaqp_prd` (agrégé par site)

---

#### `fact_include_controller_daily`
**Fréquence**: Quotidienne
**Granularité**: site_id + request_date + main_controller_name + controller_name

| Colonne | Type | Description | Règle de calcul |
|---------|------|-------------|-----------------|
| site_id | Double | ID site | - |
| request_date | DateTime | Date | - |
| main_controller_name | String | Contrôleur principal | - |
| controller_name | String | Contrôleur inclus | - |
| total_requests | Double | Requêtes inclusion | **SUM(num_requests)** |
| total_response_time_ms | Double | Temps total | **SUM(response_time)** |
| cache_hit_requests | Double | Cache hits | **SUM(num_requests WHERE cache='hit')** |
| avg_response_time_ms | Double | Temps moyen | **total_response_time_ms / total_requests** |
| total_requests_main | Double | Requêtes main | Lookup du total du main_controller |
| percent_of_main_requests | Double | % du main | **total_requests / total_requests_main** |

**Source brute**: `ccdw_aggr_include_controller_request_aaqp_prd`

---

#### `fact_include_cache_daily`
**Fréquence**: Quotidienne
**Granularité**: site_id + request_date + main_controller + controller

| Colonne | Type | Description | Règle de calcul |
|---------|------|-------------|-----------------|
| site_id | Double | ID site | - |
| request_date | DateTime | Date | - |
| main_controller_name | String | Contrôleur principal | - |
| controller_name | String | Contrôleur inclus | - |
| total_requests | Double | Total requêtes | **SUM(num_requests)** |
| cache_hit_requests | Double | Cache hits | **SUM(num_requests WHERE cache='hit')** |
| cache_miss_requests | Double | Cache miss | **SUM(num_requests WHERE cache='miss')** |
| cache_miss_and_store_requests | Double | Cache miss+store | **SUM(num_requests WHERE cache='miss_and_store')** |
| cache_hit_rate | Double | Taux hit | **cache_hit_requests / total_requests** |
| cache_miss_rate | Double | Taux miss | **cache_miss_requests / total_requests** |
| cache_miss_and_store_rate | Double | Taux miss+store | **cache_miss_and_store_requests / total_requests** |

**Source brute**: `ccdw_aggr_include_controller_request_aaqp_prd` (agrégé par cache_behavior)

---

#### `fact_api_daily OCAPI + SCAPI`
**Fréquence**: Quotidienne
**Granularité**: site_id + request_date + family

| Colonne | Type | Description | Règle de calcul |
|---------|------|-------------|-----------------|
| site_id | Double | ID site | - |
| request_date | DateTime | Date | - |
| family | String | Famille API (OCAPI/SCAPI) | - |
| total_requests | Double | Total requêtes | **SUM(num_requests) GROUP BY site_id, date, family** |
| total_response_time_ms | Double | Temps total | **SUM(response_time) GROUP BY site_id, date, family** |
| error_requests | Double | Erreurs | **SUM(num_requests WHERE status>=400) GROUP BY site_id, date, family** |
| avg_response_time_ms | Double | Temps moyen | **total_response_time_ms / total_requests** |

**Sources brutes**:
- `ccdw_aggr_scapi_request_aaqp_prd` (family='SCAPI')
- `ccdw_aggr_ocapi_request_aaqp_prd` (family='OCAPI')

---

#### `fact_api_resource_daily`
**Fréquence**: Quotidienne
**Granularité**: site_id + request_date + family + api_resource + api_name + api_version + method

| Colonne | Type | Description | Règle de calcul |
|---------|------|-------------|-----------------|
| site_id | Double | ID site | - |
| request_date | DateTime | Date | - |
| family | String | OCAPI/SCAPI | - |
| api_resource | String | Ressource API | - |
| api_name | String | Nom API | - |
| api_version | String | Version API | - |
| method | String | Méthode HTTP (GET/POST) | - |
| total_requests | Double | Total requêtes | **SUM(num_requests)** |
| total_response_time_ms | Double | Temps total | **SUM(response_time)** |
| error_requests | Double | Erreurs | **SUM(num_requests WHERE status>=400)** |
| bucket_0_499 | Double | Requêtes < 500ms | **SUM(num_requests_bucket1 à bucket4)** |
| bucket_500_999 | Double | 500-999ms | **SUM(num_requests_bucket5)** |
| bucket_1000_1499 | Double | 1000-1499ms | **SUM(num_requests_bucket6 à bucket7)** |
| bucket_1500_1999 | Double | 1500-1999ms | **SUM(num_requests_bucket8)** |
| bucket_2000_plus | Double | >= 2000ms | **SUM(num_requests_bucket9 à bucket11)** |
| avg_response_time_ms | Double | Temps moyen | **total_response_time_ms / total_requests** |

**Sources brutes**:
- `ccdw_aggr_scapi_request_aaqp_prd`
- `ccdw_aggr_ocapi_request_aaqp_prd`

---

#### `fact_promo_daily`
**Fréquence**: Quotidienne
**Granularité**: site_id + date

| Colonne | Type | Description | Règle de calcul |
|---------|------|-------------|-----------------|
| site_id | Int64 | ID site | - |
| date | DateTime | Date activation | - |
| promotions_active | Int64 | Nombre promos actives | **COUNT(DISTINCT promotion_id)** |
| promo_visits | Int64 | Visites avec promo | **SUM(num_visits)** |
| promo_activations | Int64 | Activations promo | **SUM(num_activations)** |
| promo_line_items | Int64 | Lignes commande promo | **COUNT(promotion_line_item_id)** |
| coupon_uses | Int64 | Utilisations coupons | **COUNT(coupon_id WHERE coupon_id IS NOT NULL)** |
| distinct_coupons | Int64 | Coupons distincts | **COUNT(DISTINCT coupon_id WHERE coupon_id IS NOT NULL)** |
| gm_value | Double | Valeur merchandising | **SUM(std_li_gross_merchandise_value)** |

**Sources brutes**:
- `ccdw_aggr_promotion_activation_aaqp_prd`
- `ccdw_fact_promotion_line_item_aaqp_prd`

---

#### `fact_promo_perf`
**Description**: Table jointe combinant promotions + performance cart/checkout

**Granularité**: site_id + date

| Colonne | Type | Description | Source/Calcul |
|---------|------|-------------|---------------|
| site_id | Int64 | ID site | - |
| date | DateTime | Date | - |
| promotions_active | Int64 | Promos actives | fact_promo_daily |
| promo_visits | Int64 | Visites promo | fact_promo_daily |
| promo_activations | Int64 | Activations | fact_promo_daily |
| promo_line_items | Int64 | Lignes commande | fact_promo_daily |
| coupon_uses | Int64 | Coupons utilisés | fact_promo_daily |
| distinct_coupons | Int64 | Coupons distincts | fact_promo_daily |
| gm_value | Double | GM value | fact_promo_daily |
| cart_include_requests | Double | Requêtes cart | fact_cart_daily |
| cart_include_response_ms | Double | Temps cart total | fact_cart_daily |
| cart_include_avg_response_ms | Double | Temps cart moyen | fact_cart_daily |
| checkout_include_requests | Double | Requêtes checkout | fact_checkout_daily |
| checkout_include_response_ms | Double | Temps checkout total | fact_checkout_daily |
| checkout_include_avg_response_ms | Double | Temps checkout moyen | fact_checkout_daily |

**Jointure**: LEFT JOIN entre fact_promo_daily, fact_cart_daily, fact_checkout_daily sur site_id + date

---

#### `fact_cart_daily` & `fact_checkout_daily`
**Fréquence**: Quotidienne
**Granularité**: site_id + request_date

| Colonne | Type | Description | Règle de calcul |
|---------|------|-------------|-----------------|
| site_id | Double | ID site | - |
| request_date | DateTime | Date | - |
| [cart/checkout]_include_requests | Double | Total requêtes | **SUM(num_requests WHERE controller='Cart/Checkout')** |
| [cart/checkout]_include_response_ms | Double | Temps total | **SUM(response_time WHERE controller='Cart/Checkout')** |
| [cart/checkout]_include_avg_response_ms | Double | Temps moyen | **response_ms / requests** |

**Source brute**: `ccdw_aggr_include_controller_request_aaqp_prd` (filtré sur controller 'Cart' ou 'Checkout')

---

## 4. Mesures DAX

### 4.1 Mesures ODS & Realm (`0 Measures`)

| Mesure | Expression DAX | Description |
|--------|----------------|-------------|
| **Baseline Credits** | [À documenter] | Crédits baseline du contrat |
| **Total Credits Up** | `SUM('fact_ODS Daily'[credits_up])` | Total crédits consommés |
| **Total Credits Down** | `SUM('fact_ODS Daily'[credits_down])` | Total crédits économisés |
| **Credits Used (To Date)** | [À documenter] | Crédits utilisés cumulés |
| **% Credits Used (To Date)** | `[Credits Used] / [Baseline Credits]` | % de consommation du budget |
| **Minutes Up** | `SUM('fact_ODS Daily'[total_minutes_up])` | Minutes ODS actives |
| **Minutes Down** | `SUM('fact_ODS Daily'[total_minutes_down])` | Minutes ODS inactives |
| **Nb Sites** | `SUM('Fact_Realms Daily'[nb_sites])` | Nombre de sites |
| **Nb active promotions** | `SUM('Fact_Realms Daily'[nb_active_promotions])` | Promotions actives |
| **Nb active coupons** | `SUM('Fact_Realms Daily'[nb_active_coupons])` | Coupons actifs |
| **Nb coupons** | `SUM('Fact_Realms Daily'[nb_coupons])` | Total coupons |
| **Active Promotions %** | `[Nb active promotions] / SUM([nb_promotions])` | % promotions actives |
| **Scheduled ODS % (placeholder)** | [Demo] | % ODS programmés |
| **Up-to-date Environments % (placeholder)** | [Demo] | % environnements à jour |

---

### 4.2 Mesures Technical Monitoring (`0 Mesure technical monitoring`)

| Mesure | Expression DAX | Description |
|--------|----------------|-------------|
| **Nb controller** | `DISTINCTCOUNT(fact_controller_daily[controller_name])` | Nombre de contrôleurs distincts |
| **Nb request (controller)** | `SUM(fact_controller_daily[total_requests])` | Total requêtes contrôleurs |
| **Average response time (controller)** | `AVERAGE(fact_controller_daily[avg_response_time_ms])` | Temps réponse moyen contrôleurs |
| **Average cache hit rate** | `AVERAGE(fact_controller_daily[cache_hit_rate])` | Taux moyen de cache hit |

---

## 5. Relations entre tables

### 5.1 Relations principales

| Table From | Colonne From | Table To | Colonne To | Cardinalité | Direction |
|------------|--------------|----------|------------|-------------|-----------|
| **Fact_Realms Daily** | date | **dim_Date** | Date | Many-to-One | OneDirection |
| **Fact_Realms Daily** | realm_id | **dim_Realm** | realm_id | Many-to-One | OneDirection |
| **fact_ODS Daily** | date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_ODS Daily** | realm_id | **dim_Realm** | realm_id | Many-to-One | OneDirection |
| **fact_ODS Minutes By Profile** | date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_ODS Minutes By Profile** | realm_id | **dim_Realm** | realm_id | Many-to-One | OneDirection |
| **fact_Realm** | realm_id | **dim_Realm** | realm_id | Many-to-One | OneDirection |
| **fact_controller_daily** | request_date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_controller_daily** | site_id | **dim_site** | site_id | Many-to-One | OneDirection |
| **fact_site_daily** | site_id | **dim_site** | site_id | Many-to-One | OneDirection |
| **fact_include_controller_daily** | request_date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_include_controller_daily** | site_id | **dim_site** | site_id | Many-to-One | OneDirection |
| **fact_include_cache_daily** | request_date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_include_cache_daily** | site_id | **dim_site** | site_id | Many-to-One | OneDirection |
| **fact_api_daily OCAPI + SCAPI** | request_date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_api_resource_daily** | request_date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_promo_daily** | date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_promo_perf** | date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_promo_perf_simulation** | date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_cart_daily** | request_date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_cart_daily** | site_id | **dim_site** | site_id | Many-to-One | OneDirection |
| **fact_checkout_daily** | request_date | **dim_Date** | Date | Many-to-One | OneDirection |
| **fact_checkout_daily** | site_id | **dim_site** | site_id | Many-to-One | OneDirection |
| **dim_ngl_version_score** | version | **dim_ngl_release_calendar** | version | One-to-One | BothDirections |

### 5.2 Relation bidirectionnelle (attention)

⚠️ **Relations BothDirections** (à utiliser avec précaution):
- `demo_Practices.Zone ↔ demo_up_to_date_environnements.Zone`
- `dim_ngl_version_score.version ↔ dim_ngl_release_calendar.version`

**Recommandation**: Vérifier que ces relations bidirectionnelles ne créent pas de boucles ambiguës dans le modèle.

---

## 6. Sources de données

### 6.1 LOT1 - Fichiers JSON (SharePoint → Azure)

**Emplacement actuel**:
- SharePoint: `https://loreal.sharepoint.com/:f:/r/sites/-FR-GLOBALD2CITTEAM/Documents%20partages/General/04.%20TRANSVERSAL%20PROJECTS/20.%20NERD%20-%20%20NGL%20Environments%20Reliability%20Dashboard/Data`

**Fichiers**:
1. `realms.json` → table `Fact_Realms Daily`
2. `ods.json` → table `fact_ODS Daily`
3. `static.json` (si utilisé) → données temps réel ODS

**Format attendu** (voir specs dans [Besoin metier_specs.md](Besoin%20metier_specs.md))

---

### 6.2 LOT2 - JDBC Driver SFCC (CCAC/CCDW)

**Driver**: B2C Commerce Intelligence JDBC Driver
**Documentation**: [Salesforce B2C Commerce Intelligence JDBC Driver](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/b2c-intelligence-jdbc-driver.html)

**Tables sources CCDW** (voir section 7 pour requêtes SQL):
- `ccdw_dim_site_aaqp_prd`
- `ccdw_aggr_controller_request_aaqp_prd`
- `ccdw_aggr_include_controller_request_aaqp_prd`
- `ccdw_aggr_scapi_request_aaqp_prd`
- `ccdw_aggr_ocapi_request_aaqp_prd`
- `ccdw_aggr_promotion_activation_aaqp_prd`
- `ccdw_fact_promotion_line_item_aaqp_prd`

**Connexion Power BI**: Voir [PowerBI_JDBC_Connection.md](PowerBI_JDBC_Connection.md) pour configuration R/Python

---

## 7. Requêtes SQL brutes (sans règles métier)

> ⚠️ **IMPORTANT**: Ces requêtes sont **SANS TRANSFORMATION** et **SANS RÈGLES MÉTIER**.
> Uniquement **SELECT**, **SUM**, **GROUP BY**.
> Aucun filtre métier, aucune logique conditionnelle.

### 7.1 Dimension Sites

```sql
-- dim_site
SELECT
  site_id,
  nsite_id,
  site_display_name,
  site_sitezone,
  site_currency,
  site_taxation,
  site_status,
  realm_id,
  nrealm_id,
  realm_currency,
  realm_timezone
FROM ccdw_dim_site_aaqp_prd;
```

---

### 7.2 Controllers

#### fact_controller_daily
**Logique M**: Agrège par `site_id + request_date + controller_name`, calcule les flags cache_hit et erreur, puis somme.

```sql
-- fact_controller_daily (agrégation exacte selon code M)
SELECT
  site_id,
  request_date,
  controller_name,
  SUM(num_requests) AS total_requests,
  SUM(response_time) AS total_response_time_ms,
  SUM(CASE WHEN UPPER(cache_behavior) = 'HIT' THEN num_requests ELSE 0 END) AS cache_hit_requests,
  SUM(CASE
    WHEN CAST(status_code AS VARCHAR) LIKE '4%' THEN num_requests
    WHEN CAST(status_code AS VARCHAR) LIKE '5%' THEN num_requests
    ELSE 0
  END) AS error_requests
FROM ccdw_aggr_controller_request_aaqp_prd
GROUP BY site_id, request_date, controller_name;
```

**Note**: Les colonnes calculées `avg_response_time_ms` et `cache_hit_rate` sont calculées côté Power BI (colonne calculée ou mesure DAX).
- `avg_response_time_ms = total_response_time_ms / total_requests`
- `cache_hit_rate = cache_hit_requests / total_requests`

---

#### fact_site_daily
**Logique M**: Agrège par `site_id + request_date` (sans controller_name), calcule les flags, puis somme.

```sql
-- fact_site_daily (agrégation par site selon code M)
SELECT
  site_id,
  request_date,
  SUM(num_requests) AS total_requests,
  SUM(response_time) AS total_response_time_ms,
  SUM(CASE WHEN UPPER(cache_behavior) = 'HIT' THEN num_requests ELSE 0 END) AS cache_hit_requests,
  SUM(CASE
    WHEN CAST(status_code AS VARCHAR) LIKE '4%' THEN num_requests
    WHEN CAST(status_code AS VARCHAR) LIKE '5%' THEN num_requests
    ELSE 0
  END) AS error_requests
FROM ccdw_aggr_controller_request_aaqp_prd
GROUP BY site_id, request_date;
```

**Note**: Les colonnes calculées `avg_response_time_ms`, `cache_hit_rate`, `error_rate` sont calculées côté Power BI:
- `avg_response_time_ms = total_response_time_ms / total_requests`
- `cache_hit_rate = cache_hit_requests / total_requests`
- `error_rate = error_requests / total_requests`

---

### 7.3 Include Controllers

#### fact_include_controller_daily
**Logique M**: Agrège par `site_id + request_date + main_controller_name + controller_name`, calcule cache_hit_requests.
Puis fait un lookup sur le total du main_controller pour calculer `percent_of_main_requests`.

```sql
-- fact_include_controller_daily (agrégation selon code M)
SELECT
  site_id,
  request_date,
  main_controller_name,
  controller_name,
  SUM(num_requests) AS total_requests,
  SUM(response_time) AS total_response_time_ms,
  SUM(CASE WHEN UPPER(cache_behavior) = 'HIT' THEN num_requests ELSE 0 END) AS cache_hit_requests
FROM ccdw_aggr_include_controller_request_aaqp_prd
GROUP BY site_id, request_date, main_controller_name, controller_name;
```

**Requête complémentaire pour `total_requests_main`** (agrégation du main_controller):
```sql
-- Calcul des totaux par main_controller (pour percent_of_main)
SELECT
  site_id,
  request_date,
  main_controller_name,
  SUM(num_requests) AS total_requests_main
FROM ccdw_aggr_include_controller_request_aaqp_prd
GROUP BY site_id, request_date, main_controller_name;
```

**Note**: Les colonnes calculées suivantes sont faites côté Power BI:
- `avg_response_time_ms = total_response_time_ms / total_requests`
- `percent_of_main_requests = total_requests / total_requests_main` (nécessite un JOIN avec la requête ci-dessus)

---

#### fact_include_cache_daily
**Logique M**: Agrège par `site_id + request_date + main_controller + controller + cache_behavior`, puis unpivot pour avoir une ligne par cache_behavior.

```sql
-- fact_include_cache_daily (agrégation par cache_behavior selon code M)
SELECT
  site_id,
  request_date,
  main_controller_name,
  controller_name,
  SUM(CASE WHEN UPPER(cache_behavior) = 'HIT' THEN num_requests ELSE 0 END) AS cache_hit_requests,
  SUM(CASE WHEN UPPER(cache_behavior) = 'MISS' THEN num_requests ELSE 0 END) AS cache_miss_requests,
  SUM(CASE WHEN UPPER(cache_behavior) = 'MISS_AND_STORE' THEN num_requests ELSE 0 END) AS cache_miss_and_store_requests,
  SUM(num_requests) AS total_requests
FROM ccdw_aggr_include_controller_request_aaqp_prd
GROUP BY site_id, request_date, main_controller_name, controller_name;
```

**Note**: Les taux sont calculés côté Power BI:
- `cache_hit_rate = cache_hit_requests / total_requests`
- `cache_miss_rate = cache_miss_requests / total_requests`
- `cache_miss_and_store_rate = cache_miss_and_store_requests / total_requests`

---

### 7.4 APIs (SCAPI + OCAPI)

#### fact_api_daily OCAPI + SCAPI
**Logique M**: Combine (UNION) SCAPI et OCAPI avec ajout de la colonne `family`, puis agrège par `site_id + request_date + family`.

```sql
-- fact_api_daily (agrégation par famille selon code M)
-- SCAPI
SELECT
  site_id,
  request_date,
  'SCAPI' AS family,
  SUM(num_requests) AS total_requests,
  SUM(response_time) AS total_response_time_ms,
  SUM(CASE WHEN CAST(status_code AS VARCHAR) NOT LIKE '2%' THEN num_requests ELSE 0 END) AS error_requests
FROM ccdw_aggr_scapi_request_aaqp_prd
GROUP BY site_id, request_date

UNION ALL

-- OCAPI
SELECT
  site_id,
  request_date,
  'OCAPI' AS family,
  SUM(num_requests) AS total_requests,
  SUM(response_time) AS total_response_time_ms,
  SUM(CASE WHEN CAST(status_code AS VARCHAR) NOT LIKE '2%' THEN num_requests ELSE 0 END) AS error_requests
FROM ccdw_aggr_ocapi_request_aaqp_prd
GROUP BY site_id, request_date;
```

**Note**: La colonne `avg_response_time_ms` est calculée côté Power BI:
- `avg_response_time_ms = total_response_time_ms / total_requests`

---

#### fact_api_resource_daily
**Logique M**: Combine SCAPI et OCAPI, calcule les buckets de latence, agrège par `site_id + request_date + family + api_resource + api_name + api_version + method`.

**Mapping des buckets** (selon code M analysé):
- `bucket_0_499`: buckets 1 à 5
- `bucket_500_999`: buckets 6 et 7
- `bucket_1000_1499`: buckets 8 et 9
- `bucket_1500_1999`: bucket 10
- `bucket_2000_plus`: bucket 11

```sql
-- fact_api_resource_daily (détails par ressource selon code M)
-- SCAPI
SELECT
  site_id,
  request_date,
  'SCAPI' AS family,
  api_resource,
  api_name,
  api_version,
  method,
  SUM(num_requests) AS total_requests,
  SUM(response_time) AS total_response_time_ms,
  SUM(CASE WHEN CAST(status_code AS VARCHAR) NOT LIKE '2%' THEN num_requests ELSE 0 END) AS error_requests,
  SUM(COALESCE(num_requests_bucket1,0) + COALESCE(num_requests_bucket2,0) + COALESCE(num_requests_bucket3,0) +
      COALESCE(num_requests_bucket4,0) + COALESCE(num_requests_bucket5,0)) AS bucket_0_499,
  SUM(COALESCE(num_requests_bucket6,0) + COALESCE(num_requests_bucket7,0)) AS bucket_500_999,
  SUM(COALESCE(num_requests_bucket8,0) + COALESCE(num_requests_bucket9,0)) AS bucket_1000_1499,
  SUM(COALESCE(num_requests_bucket10,0)) AS bucket_1500_1999,
  SUM(COALESCE(num_requests_bucket11,0)) AS bucket_2000_plus
FROM ccdw_aggr_scapi_request_aaqp_prd
GROUP BY site_id, request_date, api_resource, api_name, api_version, method

UNION ALL

-- OCAPI
SELECT
  site_id,
  request_date,
  'OCAPI' AS family,
  api_resource,
  api_name,
  api_version,
  method,
  SUM(num_requests) AS total_requests,
  SUM(response_time) AS total_response_time_ms,
  SUM(CASE WHEN CAST(status_code AS VARCHAR) NOT LIKE '2%' THEN num_requests ELSE 0 END) AS error_requests,
  SUM(COALESCE(num_requests_bucket1,0) + COALESCE(num_requests_bucket2,0) + COALESCE(num_requests_bucket3,0) +
      COALESCE(num_requests_bucket4,0) + COALESCE(num_requests_bucket5,0)) AS bucket_0_499,
  SUM(COALESCE(num_requests_bucket6,0) + COALESCE(num_requests_bucket7,0)) AS bucket_500_999,
  SUM(COALESCE(num_requests_bucket8,0) + COALESCE(num_requests_bucket9,0)) AS bucket_1000_1499,
  SUM(COALESCE(num_requests_bucket10,0)) AS bucket_1500_1999,
  SUM(COALESCE(num_requests_bucket11,0)) AS bucket_2000_plus
FROM ccdw_aggr_ocapi_request_aaqp_prd
GROUP BY site_id, request_date, api_resource, api_name, api_version, method;
```

**Note**: La colonne `avg_response_time_ms` est calculée côté Power BI:
- `avg_response_time_ms = total_response_time_ms / total_requests`

---

### 7.5 Promotions

```sql
-- fact_promo_daily (activations)
SELECT
  site_id,
  activation_date AS date,
  COUNT(DISTINCT promotion_id) AS promotions_active,
  SUM(num_visits) AS promo_visits,
  SUM(num_activations) AS promo_activations
FROM ccdw_aggr_promotion_activation_aaqp_prd
GROUP BY site_id, activation_date;
```

```sql
-- fact_promo_daily (line items)
SELECT
  site_id,
  CAST(std_submit_timestamp AS DATE) AS date,
  COUNT(promotion_line_item_id) AS promo_line_items,
  SUM(CASE WHEN coupon_id IS NOT NULL THEN 1 ELSE 0 END) AS coupon_uses,
  COUNT(DISTINCT coupon_id) AS distinct_coupons,
  SUM(std_li_gross_merchandise_value) AS gm_value
FROM ccdw_fact_promotion_line_item_aaqp_prd
GROUP BY site_id, CAST(std_submit_timestamp AS DATE);
```

**Note**: Les 2 requêtes ci-dessus doivent être jointes (LEFT JOIN) sur `site_id + date` pour construire `fact_promo_daily` complet.

---

### 7.6 Cart & Checkout

```sql
-- fact_cart_daily
SELECT
  request_date,
  site_id,
  SUM(num_requests) AS cart_include_requests,
  SUM(response_time) AS cart_include_response_ms
FROM ccdw_aggr_include_controller_request_aaqp_prd
WHERE controller_name = 'Cart'
GROUP BY request_date, site_id;
```

```sql
-- fact_checkout_daily
SELECT
  request_date,
  site_id,
  SUM(num_requests) AS checkout_include_requests,
  SUM(response_time) AS checkout_include_response_ms
FROM ccdw_aggr_include_controller_request_aaqp_prd
WHERE controller_name = 'Checkout'
GROUP BY request_date, site_id;
```

---

### 7.7 Table recommandations (optionnelle)

```sql
-- ccdw_aggr_detail_product_recommendation_recommender_aaqp_prd
SELECT
  recommendation_date,
  site_id,
  recommender_name,
  product_id,
  SUM(num_recommender_views) AS num_recommender_views,
  SUM(num_product_views) AS num_product_views,
  SUM(num_clicks) AS num_clicks,
  SUM(num_cart_adds) AS num_cart_adds,
  SUM(num_products_purchased) AS num_products_purchased,
  SUM(num_orders) AS num_orders,
  SUM(std_attributed_revenue) AS std_attributed_revenue
FROM ccdw_aggr_detail_product_recommendation_recommender_aaqp_prd
GROUP BY recommendation_date, site_id, recommender_name, product_id;
```

---

## 8. LOT1: Migration SharePoint vers Azure Storage

### 8.1 Contexte

**Situation actuelle**:
- Fichiers JSON (`realms.json`, `ods.json`) stockés sur **SharePoint**
- Power BI lit directement depuis SharePoint

**Objectif LOT1**:
- Migrer les fichiers vers **Azure Storage Account**
- Power BI devra pointer vers Azure Blob Storage
- Avantages: meilleure performance, scalabilité, sécurité

### 8.2 Ressources Azure créées

**Storage Account**:
- Nom: `nerdsa`
- Resource Group: `NE-GBT-RG-NERD`
- Lien: [Azure Portal - nerdsa](https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Storage/storageAccounts/nerdsa/overview)

**Function App** (orchestration):
- Nom: `nerdmvp`
- Resource Group: `NE-GBT-RG-NERD`
- Lien: [Azure Portal - nerdmvp](https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Web/sites/nerdmvp/users)

### 8.3 Actions requises

#### 8.3.1 Côté Data Engineering / DevOps (Houssem)

1. **Créer un conteneur Blob** dans `nerdsa`:
   - Nom suggéré: `nerd-data`
   - Créer les dossiers: `/realms/`, `/ods/`, `/static/`

2. **Configurer les accès**:
   - Générer une **SAS Token** ou utiliser **Azure AD authentication**
   - Fournir les clés d'accès au Power BI (via Key Vault ou variables d'environnement)

3. **Migrer les fichiers**:
   - Uploader `realms.json` → `nerd-data/realms/realms.json`
   - Uploader `ods.json` → `nerd-data/ods/ods.json`

4. **Automatiser le dépôt** (si collecte automatique):
   - Script Node.js/Python pour uploader les JSON quotidiennement
   - Ou Azure Function déclenchée par schedule

#### 8.3.2 Côté Power BI (Expert Power BI)

1. **Modifier la source de données**:
   - Actuellement: `Web.Contents("https://loreal.sharepoint.com/...")`
   - Nouveau: `AzureStorage.Blobs("https://nerdsa.blob.core.windows.net/nerd-data")`

2. **Configurer l'authentification**:
   - Utiliser **Shared Access Signature (SAS)** ou **Azure AD**
   - Stocker les credentials dans Power BI Service (Gateway)

3. **Tester la connexion**:
   - Vérifier que Power BI Desktop lit correctement les JSON depuis Azure
   - Publier sur Power BI Service et configurer le refresh via Gateway

### 8.4 Documentation Azure Storage REST API

- [Azure Storage REST API Reference](https://learn.microsoft.com/en-us/rest/api/storageservices/)
- [Get Blob (REST)](https://learn.microsoft.com/en-us/rest/api/storageservices/get-blob)

### 8.5 Point de coordination

**Contact DevOps**: Houssem
**Action**: Planifier un point avec Houssem pour finaliser:
- Génération des clés d'accès Azure Storage
- Configuration du Power BI pour pointer vers Azure
- Tests de connectivité

---

## 9. LOT2: Livraison des requêtes SQL et clés d'accès

### 9.1 Contexte

**Contact Data Engineer**: Elias Tanos (elias.tanios@loreal.com)
**Réunion**: Fin décembre avec Houssem et Lead Technique

**Demandes d'Elias**:
1. ✅ **Requêtes SQL brutes** (sans règles métier) → voir section 7
2. ⏳ **Clés d'accès** → à fournir par Houssem (DevOps)

### 9.2 Requêtes SQL livrées

Les requêtes SQL sont documentées dans:
- **Section 7** de ce document
- Fichier: [`extractions_raw.sql`](../extractions_raw.sql)

**Tables couvertes**:
1. `ccdw_dim_site_aaqp_prd`
2. `ccdw_aggr_controller_request_aaqp_prd`
3. `ccdw_aggr_include_controller_request_aaqp_prd`
4. `ccdw_aggr_scapi_request_aaqp_prd`
5. `ccdw_aggr_ocapi_request_aaqp_prd`
6. `ccdw_aggr_promotion_activation_aaqp_prd`
7. `ccdw_fact_promotion_line_item_aaqp_prd`

**Format des requêtes**:
- Uniquement `SELECT`, `SUM`, `GROUP BY`, `UNION ALL`
- Aucune règle métier, aucun filtre conditionnel complexe
- Agrégations basiques pour construire les tables de faits

### 9.3 Clés d'accès

**Responsable**: Houssem (DevOps)
**À fournir à Elias**:
- Clés JDBC pour accès aux tables CCDW
- Credentials Azure (si applicable)
- Whitelist des IP si nécessaire

**Action**: Houssem doit coordonner avec Elias pour transmettre les clés de manière sécurisée.

### 9.4 CSV quotidiens vers Azure Storage

**Objectif**: L'équipe Data (Elias) va produire des CSV quotidiens avec les données agrégées et les déposer sur Azure Storage Account.

**Processus**:
1. Elias exécute les requêtes SQL (section 7) sur le DWH CCDW
2. Export des résultats en CSV
3. Upload des CSV sur Azure Storage Account `nerdsa` dans un conteneur dédié (ex: `nerd-data/technical-monitoring/`)
4. Power BI lit les CSV depuis Azure (ou connexion directe JDBC)

---

## 10. Évolutions possibles

### 10.1 Court terme (3-6 mois)

#### 10.1.1 Amélioration du monitoring ODS

**Objectif**: Affiner le suivi de la consommation ODS

**Évolutions**:
1. **Ajout de métriques par équipe/projet**
   - Tagging des ODS par équipe (via API metadata)
   - Table `dim_ods_owner` (team, project, cost_center)
   - Permettre le chargeback par équipe

2. **Prédiction de fin de crédits**
   - Modèle de régression linéaire sur consommation historique
   - Alerte si projection > 100% avant fin de contrat
   - Mesure DAX: `Projected Credits Exhaustion Date`

3. **Optimisation des coûts ODS**
   - Identifier les ODS non-schedulés actifs 24/7
   - Recommandations de scheduling pour économiser crédits
   - Dashboard "ODS Cost Optimization"

#### 10.1.2 Enrichissement monitoring technique

**Évolutions**:
1. **Alertes de performance**
   - Threshold sur `avg_response_time_ms` par contrôleur
   - Notification si dégradation > 20% par rapport à baseline
   - Table `fact_performance_baseline` (rolling average 30j)

2. **Analyse des erreurs**
   - Drill-down sur `error_requests` par `status_code`
   - Corrélation erreurs ↔ déploiements (via table `dim_deployment_log`)
   - Dashboard "Error Analysis"

3. **Cache efficiency**
   - Recommandations pour améliorer cache hit rate
   - Identifier les contrôleurs avec cache_hit_rate < 50%
   - Calcul du gain potentiel si cache optimisé

#### 10.1.3 Monitoring des versions NGL

**Évolutions**:
1. **Adoption des versions**
   - % des realms sur version NGL à jour (< 3 mois)
   - Alerte si realm sur version deprecated
   - Mesure: `% Up-to-date Environments` (actuellement placeholder)

2. **Impact des upgrades NGL**
   - Corrélation version NGL ↔ performance (response time)
   - Avant/après upgrade: delta de performance
   - Table `fact_ngl_upgrade_impact`

---

### 10.2 Moyen terme (6-12 mois)

#### 10.2.1 Intégration des logs SFCC

**Objectif**: Parser les logs SFCC pour extraire les quotas et deprecations

**Évolutions**:
1. **Quota monitoring**
   - Parser `quota-*.log` pour extraire consommation API quotas
   - Table `fact_quota_daily` (realm, date, quota_type, usage, limit)
   - Alerte si quota > 80%

2. **Deprecation tracking**
   - Parser `deprecation-*.log` pour identifier usages API deprecated
   - Table `fact_deprecation_usage` (realm, api_name, nb_calls, date)
   - Dashboard "Deprecation Remediation"

**Challenges**:
- Accès WebDAV nécessaire (credentials par realm)
- Volume de logs important (considérer log aggregation service)
- Parsing complexe (regex ou structured logging)

#### 10.2.2 Monitoring business (conversion, revenue)

**Objectif**: Ajouter KPI business pour corréler technique ↔ business

**Évolutions**:
1. **Conversion funnel**
   - Table `fact_funnel_daily` (visits, cart_adds, checkouts, orders)
   - Corrélation temps réponse cart/checkout ↔ taux de conversion
   - Mesure: `Checkout Latency Impact on Conversion`

2. **Revenue impact**
   - Corrélation performance API ↔ revenue
   - Identifier les jours avec performance dégradée ET revenue en baisse
   - Dashboard "Performance-Revenue Correlation"

#### 10.2.3 Multi-realm comparison

**Objectif**: Benchmarking entre realms

**Évolutions**:
1. **Performance benchmarking**
   - Comparer `avg_response_time_ms` entre realms (même trafic)
   - Identifier best performers et outliers
   - Table `fact_realm_benchmark`

2. **Best practices scoring**
   - Score par realm basé sur:
     - Cache hit rate
     - % ODS schedulés
     - % version NGL à jour
     - Taux d'erreur < 1%
   - Mesure: `Best Practices Score` (actuellement placeholder)
   - Leaderboard des realms

---

### 10.3 Long terme (12+ mois)

#### 10.3.1 Machine Learning & Prédiction

**Évolutions**:
1. **Prédiction de charge**
   - Modèle de forecast du nombre de requêtes (ARIMA/Prophet)
   - Anticiper les pics de charge (Black Friday, Noël)
   - Auto-scaling des ODS basé sur prédiction

2. **Anomaly detection**
   - Isolation Forest pour détecter comportements anormaux
   - Alerte automatique si métrique dévie de 3 sigma
   - Table `fact_anomaly_detected`

3. **Recommandation automatique**
   - Système de recommandations IA pour optimisation
   - Ex: "Réduire le nombre de promotions actives pour améliorer latence checkout"
   - Dashboard "AI Recommendations"

#### 10.3.2 Intégration CI/CD

**Évolutions**:
1. **Tracking des déploiements**
   - Intégrer events CI/CD dans le dashboard
   - Table `dim_deployment` (date, version, realm, success)
   - Corrélation déploiement ↔ erreurs/performance

2. **Quality Gates automatiques**
   - Bloquer déploiement si performance < baseline
   - Intégration avec pipeline Azure DevOps
   - Webhook NERD → CI/CD

#### 10.3.3 Alerting & Incident Management

**Évolutions**:
1. **Système d'alertes avancé**
   - Power BI Alerts → Microsoft Teams
   - Escalation automatique si seuil critique
   - Intégration avec ServiceNow/JIRA

2. **Incident correlation**
   - Lier incidents ServiceNow aux métriques NERD
   - Time-to-detect (TTD) et Time-to-resolve (TTR)
   - Dashboard "Incident Response"

---

## 11. Best Practices et Sécurité

### 11.1 Sécurité des données

#### 11.1.1 Secrets et credentials

❌ **À NE JAMAIS FAIRE**:
- Stocker des secrets dans Git
- Logger des mots de passe ou clés API
- Transmettre des credentials par email

✅ **OBLIGATOIRE**:
- Utiliser Azure Key Vault pour stocker les secrets
- Variables d'environnement pour credentials (`.env` en local)
- Rotation régulière des clés (tous les 90 jours)
- SAS Token avec expiration courte (24h pour dev, 7j pour prod)

#### 11.1.2 Accès aux données

- **Row-Level Security (RLS)** dans Power BI si restriction par zone
- Limiter l'accès aux données brutes (tables CCDW) aux Data Engineers
- Dashboard Power BI: accès en lecture seule pour utilisateurs finaux
- Audit logging des accès aux données sensibles

#### 11.1.3 Données en transit

- **HTTPS obligatoire** pour toutes les connexions
- TLS 1.2 minimum pour JDBC
- Chiffrement des fichiers JSON sur Azure Blob (encryption at rest activé)

---

### 11.2 Performance Power BI

#### 11.2.1 Optimisation du modèle

1. **Utiliser Import mode** (pas DirectQuery) pour les tables de dimensions
   - Plus rapide pour les slicers
   - Moins de charge sur la source

2. **DirectQuery** uniquement pour les faits volumineux
   - Si tables > 1GB, considérer DirectQuery ou Composite model
   - Ou pré-agréger les données dans le DWH

3. **Indexes sur les tables sources**
   - Index sur `site_id`, `request_date`, `realm_id`
   - Améliore les performances DirectQuery

4. **Éviter les colonnes calculées coûteuses**
   - Préférer les mesures DAX aux colonnes calculées
   - Pousser les calculs dans le DWH si possible

#### 11.2.2 Refresh strategy

1. **Incremental refresh** pour les grandes tables
   - Configurer sur `request_date` ou `date`
   - Conserver 3 ans en full, refresh incrémental quotidien

2. **Scheduled refresh**
   - LOT1 (JSON): refresh 2x/jour (8h, 20h)
   - LOT2 (JDBC): refresh 1x/jour (6h du matin)

3. **Gateway**
   - Installer la Gateway sur une VM dédiée (pas un poste utilisateur)
   - 8GB RAM minimum, 4 CPU cores

---

### 11.3 Gouvernance des données

#### 11.3.1 Documentation

- **Maintenir à jour** cette documentation à chaque changement de modèle
- Versionner les modifications (Git)
- Changelog dans [Changelog.md](Changelog.md)

#### 11.3.2 Data Quality

1. **Validation des données**
   - Vérifier l'absence de valeurs NULL sur clés primaires
   - Contraintes de cohérence (ex: `total_requests >= cache_hit_requests`)
   - Tests automatiques sur les CSV avant ingestion

2. **Monitoring de la fraîcheur**
   - Alerte si données non rafraîchies > 48h
   - Mesure: `Max(request_date)` doit être < aujourd'hui - 1 jour

3. **Traçabilité**
   - Ajouter `load_timestamp` sur toutes les tables
   - Table `audit_refresh_log` (table_name, refresh_time, rows_inserted)

---

## 12. Contacts et ressources

### 12.1 Équipe projet

| Rôle | Nom | Email | Responsabilités |
|------|-----|-------|-----------------|
| Lead Technique | [À remplir] | [À remplir] | Architecture, coordination |
| Data Engineer | Elias Tanos | elias.tanios@loreal.com | Extraction DWH, pipeline data |
| DevOps | Houssem | [À remplir] | Azure infra, déploiement |
| Expert Power BI | [À remplir] | [À remplir] | Dashboard, DAX, visuels |

### 12.2 Ressources Salesforce

- [B2C Commerce Intelligence JDBC Driver](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/b2c-intelligence-jdbc-driver.html)
- [B2C Commerce Data Lakehouse Schema Reference](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/data-lakehouse-schema-reference.html)
- [On-Demand Sandboxes API](https://developer.salesforce.com/docs/commerce/commerce-cloud/guide/on-demand-sandboxes.html)

### 12.3 Ressources Azure

- [Azure Storage Account](https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Storage/storageAccounts/nerdsa/overview)
- [Function App nerdmvp](https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Web/sites/nerdmvp/users)
- [Azure Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/)

---

## Annexes

### Annexe A: Mapping Realm → Zone

```json
{
  "aafm": "amer",
  "aang": "amer",
  "aatl": "amer",
  "bjrm": "amer",
  "bldd": "amer",
  "aaqp": "emea",
  "bhhx": "emea",
  "bdcr": "global",
  "aarm": "na-sapmena",
  "bckq": "na-sapmena",
  "bgsj": "na-sapmena",
  "bfzm": "na-sapmena",
  "aawh": "na-sapmena"
}
```

### Annexe B: Contrat ODS

- **Début**: 1er février 2024
- **Fin**: 31 janvier 2027
- **Budget total**: 950 700 000 crédits (950,7 millions)
- **Consommation mensuelle moyenne estimée**: ~26,4 millions de crédits

### Annexe C: Glossaire

| Terme | Définition |
|-------|------------|
| **CCDW** | Commerce Cloud Data Warehouse - DWH Salesforce exposé via JDBC |
| **CCAC** | Commerce Cloud Analytics Console - outil Salesforce BI |
| **ODS** | On-Demand Sandbox - environnement de test Salesforce |
| **Realm** | Instance Salesforce B2C (ex: bdcr = realm global L'Oréal) |
| **NGL** | Next Generation Lora - framework front-end L'Oréal pour SFCC |
| **SFCC** | Salesforce B2C Commerce Cloud |
| **OCAPI** | Open Commerce API - API Salesforce historique |
| **SCAPI** | Storefront Commerce API - nouvelle API Salesforce |

---

**Fin du document**

*Document généré automatiquement le 2026-01-12 via MCP Power BI Modeling.*
