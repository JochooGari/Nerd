# NERD Dashboard - Executive Summary

**Date**: 2026-01-12
**Version**: 3.0 - RAW DATA ONLY
**Destinataire**: Lead Technique

---

## 🎯 Résumé en 30 secondes

Les requêtes SQL ont été modifiées pour retourner les **données BRUTES** (status_code, cache_behavior) sans transformation conditionnelle. Toutes les transformations (flags, calculs) se font maintenant en **Power Query**.

**Avantage clé**: Changement des règles métier côté Azure/Power BI **sans recharger** les données depuis CCDW.

---

## 📦 Livrables

| # | Livrable | Destinataire | Statut |
|---|----------|--------------|--------|
| 1 | [extractions_raw_CORRECTED.sql](extractions_raw_CORRECTED.sql) | Elias (Data) | ✅ Livré |
| 2 | [PowerQuery_Transformations.md](PowerQuery_Transformations.md) | Expert Power BI | ✅ Livré |
| 3 | [ACTIONS_ELIAS_DATA.md](ACTIONS_ELIAS_DATA.md) | Elias (Data) | ✅ Livré |
| 4 | [ACTIONS_POWERBI_EXPERT.md](ACTIONS_POWERBI_EXPERT.md) | Expert Power BI | ✅ Livré |
| 5 | [LIVRAISON_LOT1_LOT2.md](LIVRAISON_LOT1_LOT2.md) | Lead Technique | ✅ Livré |
| 6 | [DOCUMENTATION_COMPLETE_NERD.md](DOCUMENTATION_COMPLETE_NERD.md) | Tous | ✅ Livré |

---

## 🔄 Changement d'architecture (v2.0 → v3.0)

### Avant (Version 2.0)
```sql
-- SQL calculait les flags
SUM(CASE WHEN UPPER(cache_behavior) = 'HIT' THEN num_requests ELSE 0 END) AS cache_hit_requests
SUM(CASE WHEN status_code LIKE '4%' OR status_code LIKE '5%' THEN num_requests ELSE 0 END) AS error_requests
```

### Maintenant (Version 3.0)
```sql
-- SQL retourne les colonnes brutes
SELECT site_id, request_date, controller_name, cache_behavior, status_code,
       SUM(num_requests) AS num_requests, SUM(response_time) AS response_time_ms
FROM ccdw_aggr_controller_request_aaqp_prd
GROUP BY site_id, request_date, controller_name, cache_behavior, status_code;
```

```m
// Power Query calcule les flags et agrège
cache_hit_flag = if Text.Upper([cache_behavior]) = "HIT" then 1 else 0
error_flag = if Text.Start(Text.From([status_code]), 1) = "4" or
                Text.Start(Text.From([status_code]), 1) = "5" then 1 else 0

Table.Group({"site_id","request_date","controller_name"}, {
  {"total_requests", each List.Sum([num_requests])},
  {"cache_hit_requests", each List.Sum([num_requests] * [cache_hit_flag])},
  {"error_requests", each List.Sum([num_requests] * [error_flag])}
})
```

---

## ✅ Avantages

| Avantage | Impact |
|----------|--------|
| **Flexibilité** | Changement de règle métier = modifier le code M, pas de reload CCDW |
| **Indépendance Data** | Elias fournit les données telles quelles, pas de règles métier à gérer |
| **Versioning** | Les transformations sont versionnées dans le modèle Power BI |
| **Performance** | Agrégations SQL (réduction volumétrie) + transformations M (flexibilité) |
| **Maintenance** | Modifier une règle = modifier le code M uniquement |

---

## 📋 Actions requises par équipe

### Houssem (DevOps)
1. Fournir clés JDBC CCDW à Elias
2. Fournir clés Azure Storage Write à Elias
3. LOT1: Créer conteneur Blob pour realms.json et ods.json

### Elias (Data)
1. Exécuter les requêtes SQL sur CCDW
2. Exporter les CSV avec nomenclature `fact_*_raw_YYYYMMDD.csv`
3. Uploader sur Azure Storage `nerd-data/technical-monitoring/`

### Expert Power BI
1. Appliquer les transformations Power Query M documentées
2. Valider les résultats (colonnes, volumétrie, cohérence)
3. LOT1: Reconfigurer les sources JSON vers Azure Blob Storage

---

## 📊 Volumétrie estimée

| Table | Lignes/jour | Taille CSV |
|-------|-------------|------------|
| fact_controller_daily_raw | ~500K | ~50 MB |
| fact_api_resource_daily_raw | ~1M | ~100 MB |
| **Total estimé** | ~2M | **~200 MB/jour** |

---

## 🚀 Timeline

| Étape | Responsable | Date cible |
|-------|-------------|------------|
| Livraison requêtes SQL | ✅ Complété | 2026-01-12 |
| Transmission clés JDBC | Houssem → Elias | À planifier |
| Premier CSV généré | Elias | Après réception clés |
| Transformations Power Query | Expert Power BI | Après réception CSV |
| Validation end-to-end | Lead Technique | J+5 après CSV |

---

## 📞 Coordination

**Point de coordination suggéré**:
- **Participants**: Houssem (DevOps) + Elias (Data) + Expert Power BI + Lead Technique
- **Objectif**: Transmission des clés, test de connectivité, validation du workflow
- **Durée**: 1h
- **Agenda**:
  1. Génération et transmission des clés Azure Storage (10 min)
  2. Test connexion JDBC CCDW (10 min)
  3. Exécution d'une requête test (10 min)
  4. Upload d'un CSV test sur Azure (10 min)
  5. Configuration Power BI et test de transformation (15 min)
  6. Validation résultats (5 min)

---

## 📚 Documentation complète

Pour les détails complets, consulter:
- **README**: [README.md](README.md)
- **Livraison LOT1 & LOT2**: [LIVRAISON_LOT1_LOT2.md](LIVRAISON_LOT1_LOT2.md)
- **Documentation technique**: [DOCUMENTATION_COMPLETE_NERD.md](DOCUMENTATION_COMPLETE_NERD.md)

---

**Fin du résumé**

*Généré le 2026-01-12*
