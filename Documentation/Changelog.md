# Changelog (conversations et décisions)

## 2026-01-12 - Version 3.0 (RAW DATA ONLY)

### Changement majeur d'architecture
- **MODIFICATION CRITIQUE**: Les requêtes SQL retournent maintenant les **données BRUTES** (status_code, cache_behavior) sans CASE WHEN
- **Raison**: Elias (équipe Data) veut fournir les données telles quelles, sans règles métier
- **Impact**: TOUTES les transformations conditionnelles se font maintenant en Power Query
- **Avantage**: Changement des règles métier côté Azure/Power BI sans recharger depuis CCDW

### Fichiers modifiés
- `extractions_raw_CORRECTED.sql`: Retrait de tous les CASE WHEN, ajout de status_code et cache_behavior dans GROUP BY
- **NOUVEAU**: `PowerQuery_Transformations.md`: Guide détaillé des transformations M à faire pour chaque table
- `LIVRAISON_LOT1_LOT2.md`: Mise à jour pour expliquer la nouvelle approche (Version 3.0)
- `Changelog.md`: Documentation de ce changement majeur

### Détails techniques
- Les colonnes `cache_behavior` et `status_code` sont maintenant incluses dans le GROUP BY SQL
- Les flags (`cache_hit_flag`, `error_flag`) sont calculés en Power Query avec des conditions M
- Les agrégations finales (`total_requests`, `cache_hit_requests`, `error_requests`) se font en Power Query
- Exemple: `cache_hit_flag = if Text.Upper([cache_behavior]) = "HIT" then 1 else 0`

---

## 2026-01-12 - Version 2.0 (CORRECTED)
- Inventaire du modèle étoile (dimensions/faits) et des fichiers `perf_dataset/*`.
- Analyse du **code M Power BI** via MCP pour correspondance exacte SQL ↔ M
- Liste des tables brutes CCDW nécessaires (SFCC) et préparation des `SELECT` avec agrégations.
- Création `extractions_raw_CORRECTED.sql`: requêtes corrigées selon code M analysé pour 7 tables principales
- Les requêtes incluaient des CASE WHEN pour cache_hit et error_flag (approche abandonnée en v3.0)
- Ajout d'une option de requête pour la table de recommandations produit (si besoin).
- Guide de connexion Power BI via JDBC (R/Python) + bonnes pratiques secrets.
- Dossier `Documentation` avec: index, data model overview, raw SQL, guide Power BI, sécurité, changelog et next steps.

