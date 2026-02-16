# Actions pour l'Expert Power BI - NERD Dashboard

**Date**: 2026-01-12
**Version**: 3.0 - RAW DATA ONLY
**Priorité**: HAUTE

---

## 🎯 Contexte

L'équipe Data (Elias Tanos) va fournir des **données BRUTES** (status_code, cache_behavior) sans transformation conditionnelle.

**Votre responsabilité**: Appliquer les transformations Power Query pour obtenir les tables finales avec les colonnes `cache_hit_requests`, `error_requests`, etc.

---

## 📋 Actions requises

### 1️⃣ Comprendre la nouvelle approche

**Avant (Version 2.0)**:
- SQL calculait `cache_hit_requests` et `error_requests` avec des CASE WHEN
- Power BI recevait les données déjà transformées

**Maintenant (Version 3.0)**:
- SQL retourne `cache_behavior` et `status_code` bruts dans le GROUP BY
- **Vous devez appliquer les transformations en Power Query M**

**Avantage**: Si vous changez une règle métier (ex: définition d'une erreur), vous modifiez seulement le code M, pas besoin de recharger les données depuis CCDW.

---

### 2️⃣ Lire le guide des transformations

**Document à consulter**: [`PowerQuery_Transformations.md`](PowerQuery_Transformations.md)

Ce document contient:
- Le code M complet pour chaque table (fact_controller_daily, fact_site_daily, etc.)
- Les étapes détaillées (ajout de flags, calculs, agrégations)
- Les exemples de résultats attendus

---

### 3️⃣ Appliquer les transformations pour chaque table

Pour chaque table de fait, vous devez:

#### Étape 1: Charger les données brutes
```m
Source = Csv.Document(File.Contents("fact_controller_daily_raw.csv"), [Delimiter=",", Encoding=65001])
```
Ou depuis Azure Blob Storage:
```m
Source = AzureStorage.Blobs("https://nerdsa.blob.core.windows.net/nerd-data")
```

#### Étape 2: Typer les colonnes
```m
TypedTable = Table.TransformColumnTypes(Source, {
    {"site_id", type text},
    {"request_date", type date},
    {"controller_name", type text},
    {"cache_behavior", type text},
    {"status_code", Int64.Type},
    {"num_requests", Int64.Type},
    {"response_time_ms", Int64.Type}
})
```

#### Étape 3: Ajouter les flags conditionnels
```m
// Cache hit flag
AddCacheHitFlag = Table.AddColumn(TypedTable, "cache_hit_flag", each
    if Text.Upper([cache_behavior]) = "HIT" then 1 else 0, Int64.Type)

// Error flag (4xx ou 5xx)
AddErrorFlag = Table.AddColumn(AddCacheHitFlag, "error_flag", each
    if Text.Start(Text.From([status_code]), 1) = "4" or
       Text.Start(Text.From([status_code]), 1) = "5"
    then 1 else 0, Int64.Type)
```

#### Étape 4: Calculer les colonnes intermédiaires
```m
AddCacheHitRequests = Table.AddColumn(AddErrorFlag, "cache_hit_requests", each
    [num_requests] * [cache_hit_flag], Int64.Type)

AddErrorRequests = Table.AddColumn(AddCacheHitRequests, "error_requests", each
    [num_requests] * [error_flag], Int64.Type)
```

#### Étape 5: Agréger
```m
GroupedTable = Table.Group(AddErrorRequests, {"site_id", "request_date", "controller_name"}, {
    {"total_requests", each List.Sum([num_requests]), Int64.Type},
    {"total_response_time_ms", each List.Sum([response_time_ms]), Int64.Type},
    {"cache_hit_requests", each List.Sum([cache_hit_requests]), Int64.Type},
    {"error_requests", each List.Sum([error_requests]), Int64.Type}
})
```

#### Étape 6: Ajouter les colonnes calculées (moyennes, taux)
```m
AddAvgResponseTime = Table.AddColumn(GroupedTable, "avg_response_time_ms", each
    if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null, type number)

AddCacheHitRate = Table.AddColumn(AddAvgResponseTime, "cache_hit_rate", each
    if [total_requests] > 0 then [cache_hit_requests] / [total_requests] else null, type number)
```

---

### 4️⃣ Tables à transformer

Vous devez appliquer les transformations pour ces tables:

| Table Power BI | CSV brut reçu | Transformations requises |
|----------------|---------------|--------------------------|
| fact_controller_daily | fact_controller_daily_raw.csv | cache_hit_flag, error_flag, GROUP BY, avg_response_time_ms, cache_hit_rate |
| fact_site_daily | fact_site_daily_raw.csv | cache_hit_flag, error_flag, GROUP BY, avg_response_time_ms, cache_hit_rate, error_rate |
| fact_include_controller_daily | fact_include_controller_daily_raw.csv | cache_hit_flag, GROUP BY, avg_response_time_ms |
| fact_include_cache_daily | fact_include_cache_daily_raw.csv | Pivot sur cache_behavior, calcul des taux |
| fact_api_daily | fact_api_daily_raw.csv | error_flag (status ≠ 2xx), GROUP BY, avg_response_time_ms |
| fact_api_resource_daily | fact_api_resource_daily_raw.csv | error_flag, GROUP BY avec buckets, avg_response_time_ms |

Voir [`PowerQuery_Transformations.md`](PowerQuery_Transformations.md) pour le code M complet de chaque table.

---

### 5️⃣ Valider les résultats

Après avoir appliqué les transformations, vérifiez:

✅ Les colonnes finales correspondent aux noms attendus (total_requests, cache_hit_requests, error_requests, etc.)
✅ Les valeurs numériques sont cohérentes (ex: cache_hit_requests ≤ total_requests)
✅ Les taux sont entre 0 et 1 (ou 0% et 100% si en pourcentage)
✅ Pas de division par zéro (toujours vérifier `if [total_requests] > 0`)
✅ Les NULL sont gérés correctement (remplacer par 0 après les pivots)

---

### 6️⃣ Maintenir les transformations

Si vous devez changer une règle métier:

**Exemple**: Définir les erreurs comme status_code ≥ 400 (au lieu de 4xx et 5xx)

**Avant**:
```m
error_flag = if Text.Start(Text.From([status_code]), 1) = "4" or
                Text.Start(Text.From([status_code]), 1) = "5"
             then 1 else 0
```

**Après**:
```m
error_flag = if [status_code] >= 400 then 1 else 0
```

➡️ Pas besoin de recharger les CSV depuis CCDW, juste modifier le code M et rafraîchir.

---

## 🔧 Dépannage

### Problème: Valeurs NULL après l'agrégation
**Solution**: Remplacer les NULL par 0 avant de calculer les taux
```m
ReplaceNulls = Table.ReplaceValue(GroupedTable, null, 0, Replacer.ReplaceValue, {"cache_hit_requests", "error_requests"})
```

### Problème: Division par zéro
**Solution**: Toujours vérifier `if [total_requests] > 0` avant de diviser
```m
avg_response_time_ms = if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null
```

### Problème: Pivot retourne des colonnes inattendues
**Solution**: Vérifier les valeurs distinctes de cache_behavior dans les données brutes
```m
// Liste des valeurs possibles
List.Distinct(TypedTable[cache_behavior])
```

---

## 📚 Ressources

- **Guide complet des transformations**: [`PowerQuery_Transformations.md`](PowerQuery_Transformations.md)
- **Requêtes SQL brutes**: [`extractions_raw_CORRECTED.sql`](extractions_raw_CORRECTED.sql)
- **Document de livraison**: [`LIVRAISON_LOT1_LOT2.md`](LIVRAISON_LOT1_LOT2.md)

---

## 📞 Contact

Pour toute question technique sur les transformations Power Query, contacter le Lead Technique.

Pour les données brutes, contacter Elias Tanos (elias.tanios@loreal.com).

---

**Fin du document**

*Généré le 2026-01-12*
