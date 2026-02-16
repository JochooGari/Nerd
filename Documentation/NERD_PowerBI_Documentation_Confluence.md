# NERD - Documentation Power BI Data Model

**Cree par**: Data Team
**Derniere modification**: 3 fevrier 2026
**Version**: 2.0

---

## Table des matieres

1. [Introduction](#introduction)
2. [Architecture des donnees](#architecture-des-donnees)
3. [LOT 1 - ODS & Realm](#lot-1---ods--realm)
   - [Sources de donnees](#sources-de-donnees-lot-1)
   - [Tables de faits](#tables-de-faits-lot-1)
   - [Tables de dimensions](#tables-de-dimensions-lot-1)
   - [Mesures DAX](#mesures-dax-lot-1)
4. [LOT 2 - Technical Monitoring](#lot-2---technical-monitoring)
5. [Relations du modele](#relations-du-modele)
6. [Visualisations](#visualisations)
7. [Guide d'utilisation](#guide-dutilisation)
8. [Annexes](#annexes)

---

## Introduction

### Objectif du projet NERD

Le projet **NERD** (NGL Environments Reliability Dashboard) est un tableau de bord technique permettant de "prendre le pouls" de tous les realms Salesforce B2C (Commerce Cloud) de L'Oreal a travers le monde.

L'objectif est d'afficher un ensemble d'indicateurs cles de performance (KPI) pour detecter et suivre tout ecart par rapport aux operations standard :
- Depassements de quotas
- Baisse de performance cote serveur
- Consommation des credits sandbox (ODS)
- Etat des environnements

### Perimetre

| Lot | Description | Statut |
|-----|-------------|--------|
| LOT 1 | Donnees ODS (On-Demand Sandbox) et Realm | Actif |
| LOT 2 | Donnees techniques (JDBC Driver / CCAC) | Actif |

### Statistiques du modele actuel

| Element | Quantite |
|---------|----------|
| Tables | 26 |
| Relations | 23 |
| Mesures (1 Mesures) | 41 |
| Mesures (Technical Monitoring) | 4 |

---

## Architecture des donnees

### Vue d'ensemble

```
                    +------------------+
                    |   Power BI       |
                    |   Dashboard      |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+         +---------v---------+
    |   LOT 1           |         |   LOT 2           |
    |   ODS & Realm     |         |   Technical       |
    +-------------------+         +-------------------+
              |                             |
    +---------v---------+         +---------v---------+
    | Azure Blob        |         | Azure Storage     |
    | Storage           |         | (CSV via JDBC)    |
    +-------------------+         +-------------------+
              |                             |
    +---------v---------+         +---------v---------+
    | Salesforce        |         | Salesforce CCAC   |
    | ODS API           |         | (Data Lakehouse)  |
    +-------------------+         +-------------------+
```

### Sources de donnees

#### LOT 1 - Azure Blob Storage

| Parametre | Valeur |
|-----------|--------|
| Storage Account | `nerdsa` |
| URL | `https://nerdsa.blob.core.windows.net/nerd-data` |
| Container | `nerd-data` |

**Structure des fichiers** :
```
nerd-data/
+-- nerd/                    <- Production
|   +-- B2C/
|       +-- ods.json         <- Consommation ODS journaliere
|       +-- realms.json      <- Etat des sandboxes
|       +-- static.json      <- Donnees statiques (credits)
+-- nerd-dev/                <- Developpement
    +-- B2C/
        +-- ods.json
        +-- realms.json
        +-- static.json
```

#### LOT 2 - Azure Storage (CSV)

| Parametre | Valeur |
|-----------|--------|
| Site SharePoint | `https://loreal.sharepoint.com/sites/-FR-GLOBALD2CITTEAM` |
| Dossier | `/General/04. TRANSVERSAL PROJECTS/20. NERD/Data Lot 2/Source data/` |

---

## LOT 1 - ODS & Realm

### Contexte metier

#### Contrat Salesforce

| Element | Valeur |
|---------|--------|
| Date de debut | 1er fevrier 2024 |
| Date de fin | 31 octobre 2027 |
| Credits totaux | 950,700,000 minutes |
| Duree | 3 ans |

#### Concepts cles SFCC

**Minutes Up vs Minutes Down**
- **minutes_up** : Temps pendant lequel la sandbox est **active** (consomme des credits)
- **minutes_down** : Temps pendant lequel la sandbox est **inactive** (ne consomme pas de credits)

**Profils de ressources**
| Profil | Description | Coefficient |
|--------|-------------|-------------|
| medium | Profil moyen | 1x |
| large | Profil large | 1.5x |
| xlarge | Profil extra-large | 2x |
| xxlarge | Profil double extra-large | 3x |

**Etats des sandboxes**
| Etat | Description |
|------|-------------|
| started | Sandbox actuellement demarree (active) |
| stopped | Sandbox actuellement arretee |
| scheduled | Sandbox avec demarrage automatique programme |

### Sources de donnees LOT 1

#### Fichier ods.json

Donnees de consommation journaliere par realm (historisees).

```json
{
    "realm_id": "bdcr",
    "date": "2024-02-01",
    "limits_enabled": true,
    "max_nb_ods": 300,
    "minutes_up_by_profile": {
        "medium": 60946,
        "large": 5742,
        "xlarge": 2871,
        "xxlarge": 0
    },
    "total_minutes_up": 69559,
    "total_minutes_down": 2391,
    "credits_up": 83906,
    "credits_down": 719.1
}
```

#### Fichier realms.json

Etat actuel des sandboxes par profil de ressources.

```json
{
    "realm_id": "bdcr",
    "active_ods": 54,
    "org_credits": 620106944.7,
    "resource_profiles": {
        "medium": {
            "started": 42,
            "stopped": 2,
            "scheduled": 14
        },
        "large": {
            "started": 7,
            "stopped": 0,
            "scheduled": 1
        },
        "xlarge": {
            "started": 5,
            "stopped": 0,
            "scheduled": 0
        }
    }
}
```

#### Fichier static.json

Donnees statiques par realm (credits contractuels).

```json
{
    "realm_id": "bdcr",
    "org_credits": 950700000,
    "active_ods": 54
}
```

### Tables de faits LOT 1

#### Fact ODS

Table principale de consommation ODS journaliere.

| Colonne | Type | Description | Source API |
|---------|------|-------------|------------|
| `date` | Date | Date de la mesure | `/realms/{realm}/usage` |
| `realm_id` | Text | Identifiant du realm | - |
| `total_minutes_up` | Int64 | Minutes actives totales | `data.minutesUp` |
| `total_minutes_down` | Int64 | Minutes inactives totales | `data.minutesDown` |
| `limits_enabled` | Boolean | Limites ODS activees | `/realms/{realm}` |
| `max_nb_ods` | Int64 | Nombre max d'ODS autorises | `configuration.sandbox.totalNumberOfSandboxes` |
| `minutes_up_by_profile.xlarge` | Int64 | Minutes profil XLarge | `data.minutesUpByProfile` |
| `minutes_up_by_profile.large` | Int64 | Minutes profil Large | `data.minutesUpByProfile` |
| `minutes_up_by_profile.medium` | Int64 | Minutes profil Medium | `data.minutesUpByProfile` |

**Volumetrie estimee** : 365 jours x 3 ans x 13 realms = ~14,235 enregistrements

#### Fact Realm

Etat actuel des sandboxes par profil de ressources.

| Colonne | Type | Description |
|---------|------|-------------|
| `realm_id` | Text | Identifiant du realm |
| `active_ods` | Text | Nombre d'ODS actifs |
| `org_credits` | Text | Credits organisation |
| `medium_started` | Int64 | Sandboxes Medium demarrees |
| `medium_stopped` | Int64 | Sandboxes Medium arretees |
| `medium_scheduled` | Int64 | Sandboxes Medium planifiees |
| `large_started` | Int64 | Sandboxes Large demarrees |
| `large_stopped` | Int64 | Sandboxes Large arretees |
| `large_scheduled` | Int64 | Sandboxes Large planifiees |
| `xlarge_started` | Int64 | Sandboxes XLarge demarrees |
| `xlarge_stopped` | Int64 | Sandboxes XLarge arretees |
| `xlarge_scheduled` | Int64 | Sandboxes XLarge planifiees |
| `xxlarge_started` | Int64 | Sandboxes XXLarge demarrees |
| `xxlarge_stopped` | Int64 | Sandboxes XXLarge arretees |
| `xxlarge_scheduled` | Int64 | Sandboxes XXLarge planifiees |

#### Fact Static_info

Informations contractuelles statiques par realm.

| Colonne | Type | Description |
|---------|------|-------------|
| `realm_id` | Text | Identifiant du realm |
| `active_ods` | Int64 | Nombre d'ODS actuellement actifs |
| `org_credits` | Double | Credits contractuels totaux (baseline) |

### Tables de dimensions LOT 1

#### dim_localisation

Localisation geographique des realms avec coordonnees GPS.

| Colonne | Type | Description |
|---------|------|-------------|
| `realm_id` | Text | Identifiant du realm |
| `zone` | Text | Code zone (amer, emea, na-sapmena, global) |
| `capitale` | Text | Ville capitale de la zone |
| `zone_name` | Text | Nom complet de la zone |
| `latitude` | Double | Latitude pour visualisation carte |
| `longitude` | Double | Longitude pour visualisation carte |

**Mapping Realm - Zone** :

| Realm ID | Zone | Site Production |
|----------|------|-----------------|
| aafm | amer | - |
| aang | amer | lora-loreal |
| aatl | amer | latam-loreal |
| bjrm | amer | na01-saloncentric |
| aaqp | emea | emea-loreal |
| bhhx | emea | eu15-lorealsa |
| bdcr | global | eu03-lorealsa |
| aarm | na-sapmena | cn-loreal |
| bckq | na-sapmena | jp-loreal |
| bgsj | na-sapmena | eu11-lorealsa |
| bfzm | na-sapmena | ap12-lorealsa |
| aawh | na-sapmena | apac-loreal |

#### dim_Date

Table calendrier principale.

| Colonne | Type | Description |
|---------|------|-------------|
| `Date` | DateTime | Date |
| `Year` | Int64 | Annee |
| `MonthNo` | Int64 | Numero du mois |
| `Month` | Text | Nom du mois |
| `Quarter` | Text | Trimestre |
| `ISO Week` | Int64 | Semaine ISO |
| `Start Week` | DateTime | Debut de semaine |
| `month year` | Text | Format "Mois Annee" |
| `week start` | Text | Debut semaine formate |

#### dim_Date_Projection

Table calendrier etendue jusqu'au 31/10/2027 pour les projections.

| Colonne | Type | Description |
|---------|------|-------------|
| `Date` | DateTime | Date |
| `Annee` | Int64 | Annee |
| `Mois` | Int64 | Numero du mois |
| `Mois Nom` | Text | Format "MMM YYYY" |
| `Semaine` | Int64 | Numero de semaine |
| `Est Projection` | Boolean | TRUE si apres derniere date de donnees |

#### Param Jours Projection

Table parametre pour le calcul de la moyenne dynamique.

| Colonne | Type | Description |
|---------|------|-------------|
| `Nb Jours` | Int64 | Valeurs de 7 a 365 jours |

**Formule DAX** : `GENERATESERIES(7, 365, 1)`

### Mesures DAX LOT 1

#### Mesures de base - Consommation

| Mesure | Expression DAX | Description |
|--------|----------------|-------------|
| `Total Minutes Up` | `SUM('Fact ODS'[total_minutes_up])` | Total minutes actives |
| `Total Minutes Down` | `SUM('Fact ODS'[total_minutes_down])` | Total minutes inactives |
| `Minutes XLarge` | `SUM('Fact ODS'[minutes_up_by_profile.xlarge])` | Minutes profil XLarge |
| `Minutes Large` | `SUM('Fact ODS'[minutes_up_by_profile.large])` | Minutes profil Large |
| `Minutes Medium` | `SUM('Fact ODS'[minutes_up_by_profile.medium])` | Minutes profil Medium |
| `Max ODS` | `SUM('Fact ODS'[max_nb_ods])` | Nombre max ODS |
| `Baseline Credits` | `950700000` | Credits contractuels totaux |

#### Mesures de base - Etat Sandboxes

| Mesure | Expression DAX |
|--------|----------------|
| `Minutes Medium Started` | `SUM('Fact Realm'[medium_started])` |
| `Minutes Medium Stopped` | `SUM('Fact Realm'[medium_stopped])` |
| `Minutes Medium Scheduled` | `SUM('Fact Realm'[medium_scheduled])` |
| `Minutes Large Started` | `SUM('Fact Realm'[large_started])` |
| `Minutes Large Stopped` | `SUM('Fact Realm'[large_stopped])` |
| `Minutes Large Scheduled` | `SUM('Fact Realm'[large_scheduled])` |
| `Minutes XLarge Started` | `SUM('Fact Realm'[xlarge_started])` |
| `Minutes XLarge Stopped` | `SUM('Fact Realm'[xlarge_stopped])` |
| `Minutes XLarge Scheduled` | `SUM('Fact Realm'[xlarge_scheduled])` |
| `Minutes XXLarge Started` | `SUM('Fact Realm'[xxlarge_started])` |
| `Minutes XXLarge Stopped` | `SUM('Fact Realm'[xxlarge_stopped])` |
| `Minutes XXLarge Scheduled` | `SUM('Fact Realm'[xxlarge_scheduled])` |
| `Total Minutes Started` | Somme des 4 profils Started |
| `Total Minutes Stopped` | Somme des 4 profils Stopped |
| `Total Minutes Scheduled` | Somme des 4 profils Scheduled |

#### Mesures de comptage

| Mesure | Expression DAX |
|--------|----------------|
| `Nb Realms` | `DISTINCTCOUNT('Fact Realm'[realm_id])` |
| `Nb Realms ODS` | `DISTINCTCOUNT('Fact ODS'[realm_id])` |

#### Mesures de credits

| Mesure | Expression DAX | Description |
|--------|----------------|-------------|
| `Sandbox Credits Used` | `DIVIDE([Total Minutes Up], MAX('Fact Static_info'[org_credits]), 0)` | % credits utilises |
| `Total Minutes Restants` | `MAX('Fact Static_info'[org_credits]) - [Total Minutes Up]` | Credits restants |

#### Mesures de projection dynamique

Ces mesures permettent de projeter la consommation jusqu'a la fin du contrat (31/10/2027).

| Mesure | Description |
|--------|-------------|
| `Nb Jours Selectionne` | Nombre de jours choisi par l'utilisateur pour le calcul de la moyenne |
| `Derniere Date Donnees` | Derniere date avec des donnees dans Fact ODS |
| `Jours Restants Contrat` | Nombre de jours entre derniere date et 31/10/2027 |
| `Moyenne Minutes par Jour` | Moyenne des minutes sur les N derniers jours |
| `Projection Minutes 31-10-2027` | Projection lineaire de la consommation totale |
| `% Projection Credits Used` | Pourcentage projete des credits au 31/10/2027 |

**Formule cle - Moyenne Minutes par Jour** :
```dax
Moyenne Minutes par Jour =
VAR DernierJour = [Derniere Date Donnees]
VAR NbJours = [Nb Jours Selectionne]
VAR PremierJour = DernierJour - NbJours + 1
RETURN
CALCULATE(
    DIVIDE([Total Minutes Up], NbJours, 0),
    'Fact ODS'[date] >= PremierJour && 'Fact ODS'[date] <= DernierJour
)
```

**Formule cle - Projection** :
```dax
Projection Minutes 31-10-2027 =
VAR ConsommationActuelle = [Total Minutes Up]
VAR MoyenneParJour = [Moyenne Minutes par Jour]
VAR JoursRestants = [Jours Restants Contrat]
RETURN
ConsommationActuelle + (MoyenneParJour * JoursRestants)
```

#### Mesures cumulatives (graphique d'evolution)

| Mesure | Description |
|--------|-------------|
| `Cumul Minutes Up` | Running total des minutes jusqu'a la date courante (donnees reelles) |
| `Cumul Minutes Projection` | Projection cumulative apres derniere date de donnees |
| `% Cumul Credits` | % cumule des credits (donnees reelles) |
| `% Cumul Credits Projection` | % cumule projete |
| `Alert Threshold` | Seuil d'alerte a 85% |

**Formule cle - Cumul Minutes Up** :
```dax
Cumul Minutes Up =
VAR CurrentDate = MAX(dim_Date_Projection[Date])
VAR DernierJourDonnees = [Derniere Date Donnees]
RETURN
IF(
    CurrentDate <= DernierJourDonnees,
    CALCULATE(
        [Total Minutes Up],
        FILTER(ALL('Fact ODS'), 'Fact ODS'[date] <= CurrentDate)
    ),
    BLANK()
)
```

#### Mesure de statut (carte geographique)

```dax
Statut Realm =
VAR PctUsed = [Sandbox Credits Used]
RETURN
SWITCH(
    TRUE(),
    PctUsed >= 0.85, "Critical",
    PctUsed >= 0.70, "Warning",
    "Active"
)
```

| Statut | Condition | Couleur |
|--------|-----------|---------|
| Active | < 70% | Vert |
| Warning | 70% - 85% | Orange |
| Critical | >= 85% | Rouge |

---

## LOT 2 - Technical Monitoring

### Sources de donnees

Les donnees sont recuperees via le JDBC Driver Salesforce CCAC et stockees en CSV sur Azure Storage.

### Tables disponibles

| Table | Colonnes | Description |
|-------|----------|-------------|
| `fact_controller_daily` | 9 | Performance des controleurs |
| `fact_site_daily` | 9 | Metriques par site |
| `fact_include_controller_daily` | 10 | Includes controleurs |
| `fact_include_cache_daily` | 11 | Cache includes |
| `fact_api_daily OCAPI + SCAPI` | 7 | Appels API |
| `fact_api_resource_daily` | 16 | Ressources API |
| `fact_promo_daily` | 9 | Promotions |
| `fact_cart_daily` | 5 | Panier |
| `fact_promo_perf` | 15 | Performance promos |
| `fact_promo_perf_simulation` | 17 | Simulation promos |
| `fact_checkout_daily` | 5 | Checkout |

### Tables de dimensions

| Table | Colonnes | Description |
|-------|----------|-------------|
| `dim_site` | 5 | Informations sites |
| `dim_ngl_release_calendar` | 3 | Calendrier releases NGL |
| `dim_ngl_version_score` | 2 | Scores versions |

---

## Relations du modele

### Schema des relations LOT 1

```
                 +----------------+
                 | dim_localisation|
                 +-------+--------+
                         |
         +---------------+---------------+
         |               |               |
+--------v------+ +------v-------+ +-----v--------+
|   Fact ODS    | |  Fact Realm  | |Fact Static   |
+-------+-------+ +--------------+ +--------------+
        |
+-------v-------+
|   dim_Date    |
+---------------+
```

### Detail des relations

| Table Source | Colonne | Table Cible | Colonne | Type |
|--------------|---------|-------------|---------|------|
| Fact ODS | realm_id | dim_localisation | realm_id | N:1 |
| Fact ODS | date | dim_Date | Date | N:1 |
| Fact Realm | realm_id | dim_localisation | realm_id | N:1 |
| Fact Static_info | realm_id | dim_localisation | realm_id | N:1 |
| dim_localisation | zone_name | demo_up_to_date_environnements | Zone | N:1 |

### Relations LOT 2

Toutes les tables fact_* du LOT 2 sont reliees a :
- `dim_Date` via `request_date` ou `date`
- `dim_site` via `site_id`

---

## Visualisations

### 1. Graphique d'evolution des credits

**Objectif** : Afficher la consommation cumulee des credits avec projection jusqu'a fin de contrat.

| Element | Configuration |
|---------|---------------|
| Axe X | `dim_Date_Projection[Date]` |
| Ligne reelle | `Cumul Minutes Up` ou `% Cumul Credits` |
| Ligne projection | `Cumul Minutes Projection` ou `% Cumul Credits Projection` |
| Seuil | `Alert Threshold` (85%) |

### 2. Carte geographique

**Objectif** : Visualiser l'etat des realms par localisation.

| Element | Configuration |
|---------|---------------|
| Latitude | `dim_localisation[latitude]` |
| Longitude | `dim_localisation[longitude]` |
| Couleur | `Statut Realm` |
| Taille | `Sandbox Credits Used` |

### 3. KPIs principaux

| KPI | Mesure | Description |
|-----|--------|-------------|
| % Credits utilises | `Sandbox Credits Used` | Pourcentage actuel |
| Credits restants | `Total Minutes Restants` | En minutes |
| Projection fin contrat | `Projection Minutes 31-10-2027` | Estimation |
| Jours restants | `Jours Restants Contrat` | Avant echeance |

---

## Guide d'utilisation

### Parametrer la projection

1. Utiliser le slicer "Param Jours Projection" pour selectionner le nombre de jours pour le calcul de la moyenne (7 a 365)
2. Une valeur plus elevee lisse les variations
3. Une valeur plus faible reflete les tendances recentes

### Interpreter les statuts

| Statut | Action recommandee |
|--------|-------------------|
| **Active** (< 70%) | Situation normale |
| **Warning** (70-85%) | Surveiller la consommation |
| **Critical** (>= 85%) | Action immediate requise |

### Filtrer par zone

Utiliser les slicers :
- `dim_localisation[zone]` : amer, emea, na-sapmena, global
- `dim_localisation[zone_name]` : Americas, Europe, NA SAPMENA, Global

---

## Annexes

### Parametres Power Query

#### LOT 1 v2 (Azure Blob Storage)

| Parametre | Valeur | Description |
|-----------|--------|-------------|
| `pEnvironment` | "nerd" | Environnement (nerd ou nerd-dev) |
| `pAzureBlobUrl` | https://nerdsa.blob.core.windows.net/nerd-data | URL du storage |
| `FX_ReadJsonFromBlob` | (fonction) | Helper pour lire JSON depuis Azure |

#### LOT 1 Legacy (SharePoint)

| Parametre | Valeur |
|-----------|--------|
| `pSPSite` | https://loreal.sharepoint.com/sites/-FR-GLOBALD2CITTEAM |
| `pFolderPath` | /General/04. TRANSVERSAL PROJECTS/20. NERD/Data/ |
| `pRealmsFile` | realms.json |
| `pODSFile` | ods.json |
| `pStartDate` | 1er fevrier 2024 |





#### Bonnes pratiques

- Utiliser `DIVIDE()` au lieu de `/`
- Utiliser `MAX()` pour recuperer une valeur unique
- Pattern `VAR/RETURN` pour mesures complexes
- Tester avec `CALCULATE` + `FILTER` pour les running totals

### Historique des modifications

| Date | Modification | Auteur |
|------|--------------|--------|
| 2024-02-01 | Creation initiale | Data Team |
| 2025-12-15 | Migration LOT1 vers Azure Blob | Data Team |
| 2026-02-02 | Ajout tables SRC_Ods, SRC_Realm | Data Team |
| 2026-02-03 | Ajout mesures projection dynamique | Data Team |
| 2026-02-03 | Ajout mesures cumulatives | Data Team |
| 2026-02-03 | Ajout mesure Statut Realm | Data Team |
| 2026-02-03 | Ajout coordonnees GPS dim_localisation | Data Team |
| 2026-02-03 | Creation tables dim_Date_Projection, Param Jours Projection | Data Team |

### Contacts

| Role | Contact |
|------|---------|
| Product Owner | PIERRON Cyril |
| Data Team | elias.tanios@loreal.com |
| Architecture | Thibault |

### Liens utiles

- [Salesforce ODS API Documentation](https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/on-demand-sandboxes.html)
- [B2C Commerce Data Lakehouse Schema Reference](https://documentation.b2c.commercecloud.salesforce.com/)
- [Azure Storage REST API](https://docs.microsoft.com/en-us/rest/api/storageservices/)

---

*Document genere automatiquement - Version 2.0*
