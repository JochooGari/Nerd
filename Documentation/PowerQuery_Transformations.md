# Transformations Power Query - NERD Dashboard

**Date**: 2026-01-12
**Version**: 3.0
**Contexte**: Les requêtes SQL retournent désormais les données **BRUTES** (status_code, cache_behavior) sans transformation conditionnelle. Toutes les transformations se font en Power Query.

---

## 📋 Principe général

### Avantages de cette approche

✅ **Flexibilité**: Changement des règles métier sans recharger les données depuis CCDW
✅ **Indépendance de l'équipe Data**: Elias fournit les données brutes telles quelles
✅ **Contrôle côté Azure/Power BI**: Les transformations sont versionnées dans le modèle Power BI
✅ **Performance**: Les agrégations sont faites en SQL, seules les transformations logiques sont en M

---

## 1️⃣ fact_controller_daily

### Données SQL reçues
```
site_id, request_date, controller_name, cache_behavior, status_code, num_requests, response_time_ms
```

### Transformations Power Query (étapes M)

```m
// 1. Charger les données depuis CSV ou JDBC
let
    Source = Csv.Document(File.Contents("fact_controller_daily_raw.csv"), [Delimiter=",", Encoding=65001]),
    TypedTable = Table.TransformColumnTypes(Source, {
        {"site_id", type text},
        {"request_date", type date},
        {"controller_name", type text},
        {"cache_behavior", type text},
        {"status_code", Int64.Type},
        {"num_requests", Int64.Type},
        {"response_time_ms", Int64.Type}
    }),

    // 2. Ajouter cache_hit_flag
    AddCacheHitFlag = Table.AddColumn(TypedTable, "cache_hit_flag", each
        if Text.Upper([cache_behavior]) = "HIT" then 1 else 0, Int64.Type),

    // 3. Ajouter error_flag (status 4xx ou 5xx)
    AddErrorFlag = Table.AddColumn(AddCacheHitFlag, "error_flag", each
        if Text.Start(Text.From([status_code]), 1) = "4" or
           Text.Start(Text.From([status_code]), 1) = "5"
        then 1 else 0, Int64.Type),

    // 4. Calculer cache_hit_requests et error_requests
    AddCacheHitRequests = Table.AddColumn(AddErrorFlag, "cache_hit_requests", each
        [num_requests] * [cache_hit_flag], Int64.Type),
    AddErrorRequests = Table.AddColumn(AddCacheHitRequests, "error_requests", each
        [num_requests] * [error_flag], Int64.Type),

    // 5. Group par site_id, request_date, controller_name
    GroupedTable = Table.Group(AddErrorRequests, {"site_id", "request_date", "controller_name"}, {
        {"total_requests", each List.Sum([num_requests]), Int64.Type},
        {"total_response_time_ms", each List.Sum([response_time_ms]), Int64.Type},
        {"cache_hit_requests", each List.Sum([cache_hit_requests]), Int64.Type},
        {"error_requests", each List.Sum([error_requests]), Int64.Type}
    }),

    // 6. Ajouter colonnes calculées (moyennes, taux)
    AddAvgResponseTime = Table.AddColumn(GroupedTable, "avg_response_time_ms", each
        if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null, type number),
    AddCacheHitRate = Table.AddColumn(AddAvgResponseTime, "cache_hit_rate", each
        if [total_requests] > 0 then [cache_hit_requests] / [total_requests] else null, type number)
in
    AddCacheHitRate
```

### Résultat final
```
site_id, request_date, controller_name, total_requests, total_response_time_ms,
cache_hit_requests, error_requests, avg_response_time_ms, cache_hit_rate
```

---

## 2️⃣ fact_site_daily

### Données SQL reçues
```
site_id, request_date, cache_behavior, status_code, num_requests, response_time_ms
```

### Transformations Power Query (étapes M)

```m
// Même logique que fact_controller_daily, mais sans controller_name dans le GROUP BY
let
    Source = Csv.Document(File.Contents("fact_site_daily_raw.csv"), [Delimiter=",", Encoding=65001]),
    TypedTable = Table.TransformColumnTypes(Source, {
        {"site_id", type text},
        {"request_date", type date},
        {"cache_behavior", type text},
        {"status_code", Int64.Type},
        {"num_requests", Int64.Type},
        {"response_time_ms", Int64.Type}
    }),

    AddCacheHitFlag = Table.AddColumn(TypedTable, "cache_hit_flag", each
        if Text.Upper([cache_behavior]) = "HIT" then 1 else 0, Int64.Type),
    AddErrorFlag = Table.AddColumn(AddCacheHitFlag, "error_flag", each
        if Text.Start(Text.From([status_code]), 1) = "4" or
           Text.Start(Text.From([status_code]), 1) = "5"
        then 1 else 0, Int64.Type),
    AddCacheHitRequests = Table.AddColumn(AddErrorFlag, "cache_hit_requests", each
        [num_requests] * [cache_hit_flag], Int64.Type),
    AddErrorRequests = Table.AddColumn(AddCacheHitRequests, "error_requests", each
        [num_requests] * [error_flag], Int64.Type),

    // Group par site_id, request_date (sans controller_name)
    GroupedTable = Table.Group(AddErrorRequests, {"site_id", "request_date"}, {
        {"total_requests", each List.Sum([num_requests]), Int64.Type},
        {"total_response_time_ms", each List.Sum([response_time_ms]), Int64.Type},
        {"cache_hit_requests", each List.Sum([cache_hit_requests]), Int64.Type},
        {"error_requests", each List.Sum([error_requests]), Int64.Type}
    }),

    AddAvgResponseTime = Table.AddColumn(GroupedTable, "avg_response_time_ms", each
        if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null, type number),
    AddCacheHitRate = Table.AddColumn(AddAvgResponseTime, "cache_hit_rate", each
        if [total_requests] > 0 then [cache_hit_requests] / [total_requests] else null, type number),
    AddErrorRate = Table.AddColumn(AddCacheHitRate, "error_rate", each
        if [total_requests] > 0 then [error_requests] / [total_requests] else null, type number)
in
    AddErrorRate
```

### Résultat final
```
site_id, request_date, total_requests, total_response_time_ms, cache_hit_requests,
error_requests, avg_response_time_ms, cache_hit_rate, error_rate
```

---

## 3️⃣ fact_include_controller_daily

### Données SQL reçues
```
site_id, request_date, main_controller_name, controller_name, cache_behavior, num_requests, response_time_ms
```

### Transformations Power Query (étapes M)

```m
let
    Source = Csv.Document(File.Contents("fact_include_controller_daily_raw.csv"), [Delimiter=",", Encoding=65001]),
    TypedTable = Table.TransformColumnTypes(Source, {
        {"site_id", type text},
        {"request_date", type date},
        {"main_controller_name", type text},
        {"controller_name", type text},
        {"cache_behavior", type text},
        {"num_requests", Int64.Type},
        {"response_time_ms", Int64.Type}
    }),

    // Ajouter cache_hit_flag
    AddCacheHitFlag = Table.AddColumn(TypedTable, "cache_hit_flag", each
        if Text.Upper([cache_behavior]) = "HIT" then 1 else 0, Int64.Type),
    AddCacheHitRequests = Table.AddColumn(AddCacheHitFlag, "cache_hit_requests", each
        [num_requests] * [cache_hit_flag], Int64.Type),

    // Group par site_id, request_date, main_controller_name, controller_name
    GroupedTable = Table.Group(AddCacheHitRequests,
        {"site_id", "request_date", "main_controller_name", "controller_name"}, {
        {"total_requests", each List.Sum([num_requests]), Int64.Type},
        {"total_response_time_ms", each List.Sum([response_time_ms]), Int64.Type},
        {"cache_hit_requests", each List.Sum([cache_hit_requests]), Int64.Type}
    }),

    AddAvgResponseTime = Table.AddColumn(GroupedTable, "avg_response_time_ms", each
        if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null, type number)
in
    AddAvgResponseTime
```

### Résultat final
```
site_id, request_date, main_controller_name, controller_name, total_requests,
total_response_time_ms, cache_hit_requests, avg_response_time_ms
```

---

## 4️⃣ fact_include_cache_daily

### Données SQL reçues
```
site_id, request_date, main_controller_name, controller_name, cache_behavior, num_requests
```

### Transformations Power Query (étapes M)

```m
let
    Source = Csv.Document(File.Contents("fact_include_cache_daily_raw.csv"), [Delimiter=",", Encoding=65001]),
    TypedTable = Table.TransformColumnTypes(Source, {
        {"site_id", type text},
        {"request_date", type date},
        {"main_controller_name", type text},
        {"controller_name", type text},
        {"cache_behavior", type text},
        {"num_requests", Int64.Type}
    }),

    // Pivot sur cache_behavior pour créer les colonnes
    PivotedTable = Table.Pivot(TypedTable,
        List.Distinct(TypedTable[cache_behavior]),
        "cache_behavior",
        "num_requests",
        List.Sum),

    // Renommer les colonnes si nécessaire et remplacer null par 0
    ReplaceNulls = Table.ReplaceValue(PivotedTable, null, 0, Replacer.ReplaceValue,
        {"HIT", "MISS", "MISS_AND_STORE"}),

    RenameColumns = Table.RenameColumns(ReplaceNulls, {
        {"HIT", "cache_hit_requests"},
        {"MISS", "cache_miss_requests"},
        {"MISS_AND_STORE", "cache_miss_and_store_requests"}
    }),

    // Ajouter total_requests
    AddTotalRequests = Table.AddColumn(RenameColumns, "total_requests", each
        [cache_hit_requests] + [cache_miss_requests] + [cache_miss_and_store_requests], Int64.Type),

    // Ajouter taux
    AddCacheHitRate = Table.AddColumn(AddTotalRequests, "cache_hit_rate", each
        if [total_requests] > 0 then [cache_hit_requests] / [total_requests] else null, type number),
    AddCacheMissRate = Table.AddColumn(AddCacheHitRate, "cache_miss_rate", each
        if [total_requests] > 0 then [cache_miss_requests] / [total_requests] else null, type number),
    AddCacheMissAndStoreRate = Table.AddColumn(AddCacheMissRate, "cache_miss_and_store_rate", each
        if [total_requests] > 0 then [cache_miss_and_store_requests] / [total_requests] else null, type number)
in
    AddCacheMissAndStoreRate
```

### Résultat final
```
site_id, request_date, main_controller_name, controller_name, cache_hit_requests,
cache_miss_requests, cache_miss_and_store_requests, total_requests,
cache_hit_rate, cache_miss_rate, cache_miss_and_store_rate
```

---

## 5️⃣ fact_api_daily

### Données SQL reçues
```
site_id, request_date, family, status_code, num_requests, response_time_ms
```

### Transformations Power Query (étapes M)

```m
let
    Source = Csv.Document(File.Contents("fact_api_daily_raw.csv"), [Delimiter=",", Encoding=65001]),
    TypedTable = Table.TransformColumnTypes(Source, {
        {"site_id", type text},
        {"request_date", type date},
        {"family", type text},
        {"status_code", Int64.Type},
        {"num_requests", Int64.Type},
        {"response_time_ms", Int64.Type}
    }),

    // Ajouter error_flag (status_code ne commence pas par "2")
    AddErrorFlag = Table.AddColumn(TypedTable, "error_flag", each
        if not Text.StartsWith(Text.From([status_code]), "2") then 1 else 0, Int64.Type),
    AddErrorRequests = Table.AddColumn(AddErrorFlag, "error_requests", each
        [num_requests] * [error_flag], Int64.Type),

    // Group par site_id, request_date, family
    GroupedTable = Table.Group(AddErrorRequests, {"site_id", "request_date", "family"}, {
        {"total_requests", each List.Sum([num_requests]), Int64.Type},
        {"total_response_time_ms", each List.Sum([response_time_ms]), Int64.Type},
        {"error_requests", each List.Sum([error_requests]), Int64.Type}
    }),

    AddAvgResponseTime = Table.AddColumn(GroupedTable, "avg_response_time_ms", each
        if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null, type number)
in
    AddAvgResponseTime
```

### Résultat final
```
site_id, request_date, family, total_requests, total_response_time_ms, error_requests, avg_response_time_ms
```

---

## 6️⃣ fact_api_resource_daily

### Données SQL reçues
```
site_id, request_date, family, api_resource, api_name, api_version, method, status_code,
num_requests, response_time_ms, bucket_0_499, bucket_500_999, bucket_1000_1499,
bucket_1500_1999, bucket_2000_plus
```

### Transformations Power Query (étapes M)

```m
let
    Source = Csv.Document(File.Contents("fact_api_resource_daily_raw.csv"), [Delimiter=",", Encoding=65001]),
    TypedTable = Table.TransformColumnTypes(Source, {
        {"site_id", type text},
        {"request_date", type date},
        {"family", type text},
        {"api_resource", type text},
        {"api_name", type text},
        {"api_version", type text},
        {"method", type text},
        {"status_code", Int64.Type},
        {"num_requests", Int64.Type},
        {"response_time_ms", Int64.Type},
        {"bucket_0_499", Int64.Type},
        {"bucket_500_999", Int64.Type},
        {"bucket_1000_1499", Int64.Type},
        {"bucket_1500_1999", Int64.Type},
        {"bucket_2000_plus", Int64.Type}
    }),

    // Ajouter error_flag
    AddErrorFlag = Table.AddColumn(TypedTable, "error_flag", each
        if not Text.StartsWith(Text.From([status_code]), "2") then 1 else 0, Int64.Type),
    AddErrorRequests = Table.AddColumn(AddErrorFlag, "error_requests", each
        [num_requests] * [error_flag], Int64.Type),

    // Group par site_id, request_date, family, api_resource, api_name, api_version, method
    GroupedTable = Table.Group(AddErrorRequests,
        {"site_id", "request_date", "family", "api_resource", "api_name", "api_version", "method"}, {
        {"total_requests", each List.Sum([num_requests]), Int64.Type},
        {"total_response_time_ms", each List.Sum([response_time_ms]), Int64.Type},
        {"error_requests", each List.Sum([error_requests]), Int64.Type},
        {"bucket_0_499", each List.Sum([bucket_0_499]), Int64.Type},
        {"bucket_500_999", each List.Sum([bucket_500_999]), Int64.Type},
        {"bucket_1000_1499", each List.Sum([bucket_1000_1499]), Int64.Type},
        {"bucket_1500_1999", each List.Sum([bucket_1500_1999]), Int64.Type},
        {"bucket_2000_plus", each List.Sum([bucket_2000_plus]), Int64.Type}
    }),

    AddAvgResponseTime = Table.AddColumn(GroupedTable, "avg_response_time_ms", each
        if [total_requests] > 0 then [total_response_time_ms] / [total_requests] else null, type number)
in
    AddAvgResponseTime
```

### Résultat final
```
site_id, request_date, family, api_resource, api_name, api_version, method, total_requests,
total_response_time_ms, error_requests, bucket_0_499, bucket_500_999, bucket_1000_1499,
bucket_1500_1999, bucket_2000_plus, avg_response_time_ms
```

---

## 📝 Notes importantes

### Gestion des NULL
- Toujours vérifier que `total_requests > 0` avant de diviser pour éviter les erreurs de division par zéro
- Remplacer les `null` par `0` après les pivots pour éviter les problèmes dans les agrégations

### Performance
- Les `Table.Group` sont optimisés par Power Query et s'exécutent en mémoire
- Les transformations conditionnelles (flags) sont évaluées ligne par ligne mais restent performantes

### Maintenance
- Si vous changez une règle métier (ex: définition d'une erreur), modifiez uniquement le code M
- Pas besoin de recharger les données depuis CCDW
- Les données brutes restent inchangées

### Versioning
- Documenter chaque changement de logique dans le code M (commentaires)
- Tester les transformations sur un échantillon avant de les appliquer sur toutes les données

---

## 🔄 Workflow de déploiement

1. **Elias (Data Engineer)** exécute les requêtes SQL et génère les CSV bruts
2. **Azure Storage** stocke les CSV dans `nerd-data/technical-monitoring/`
3. **Power BI Desktop** charge les CSV et applique les transformations M
4. **Validation** par l'équipe Power BI (vérification des résultats)
5. **Publication** sur Power BI Service avec refresh planifié

---

**Fin du document**

*Généré le 2026-01-12*
