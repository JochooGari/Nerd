-- ============================================================================
-- NERD - Extractions SFCC brutes pour Elias
-- ============================================================================
-- Date: 2026-01-28
-- Version: 5.0 - FORMAT ELIAS (noms de tables corriges)
-- Contact Data: elias.tanios@loreal.com
--
-- IMPORTANT: Le realm est defini par la CONNEXION JDBC, pas par le nom de table
-- URL JDBC: jdbc:salesforcecc://jdbc.analytics.commercecloud.salesforce.com:443/{realm}_prd
-- Exemple: jdbc:salesforcecc://jdbc.analytics.commercecloud.salesforce.com:443/aaqp_prd
--
-- REALMS DISPONIBLES: aafm, aang, aaqp, aarm, aatl, aawh, bckq, bdcr, bfzm, bgsj, bhhx
-- NOMMAGE FICHIERS: nomdelatable_{realm}_prd_<YYYYMMDDHHmmSS>.csv
--   Exemple: ccdw_dim_site_aaqp_prd_20260128120000.csv
--
-- ============================================================================
-- FILTRES DE DATE (a remplacer par les valeurs reelles):
-- ============================================================================
-- HISTORIQUE:
--   {start_date} = '2024-02-01'
--   {end_date}   = date du jour (ex: '2026-01-28')
--
-- INCREMENTAL QUOTIDIEN:
--   {start_date} = date de hier (ex: '2026-01-27')
--   {end_date}   = date du jour (ex: '2026-01-28')
-- ============================================================================
--
-- IMPORTANT:
-- - Ces requetes retournent les donnees BRUTES de SFCC
-- - AUCUNE transformation (SUM, CASE WHEN, GROUP BY, UNION ALL)
-- - AUCUNE agregation - donnees ligne par ligne
-- - Les transformations seront faites cote client (Power Query/Azure)
-- - Schema: warehouse
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. DIMENSION SITES
-- ----------------------------------------------------------------------------
-- Table: warehouse.ccdw_dim_site
-- Filtre: AUCUN (petite table de reference)
-- Frequence: Extraction complete a chaque run

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
FROM warehouse.ccdw_dim_site;


-- ----------------------------------------------------------------------------
-- 2. CONTROLLER REQUESTS
-- ----------------------------------------------------------------------------
-- Table: warehouse.ccdw_aggr_controller_request
-- Filtre: request_date
-- Colonnes brutes: cache_behavior, status_code (pas de transformation)

SELECT
  site_id,
  request_date,
  controller_name,
  cache_behavior,
  status_code,
  num_requests,
  response_time
FROM warehouse.ccdw_aggr_controller_request
WHERE request_date >= '{start_date}' AND request_date < '{end_date}';


-- ----------------------------------------------------------------------------
-- 3. INCLUDE CONTROLLER REQUESTS
-- ----------------------------------------------------------------------------
-- Table: warehouse.ccdw_aggr_include_controller_request
-- Filtre: request_date
-- Utilise pour: fact_include_controller_daily, fact_include_cache_daily,
--               fact_cart_daily (controller_name='Cart'),
--               fact_checkout_daily (controller_name='Checkout')

SELECT
  site_id,
  request_date,
  main_controller_name,
  controller_name,
  cache_behavior,
  status_code,
  num_requests,
  response_time
FROM warehouse.ccdw_aggr_include_controller_request
WHERE request_date >= '{start_date}' AND request_date < '{end_date}';


-- ----------------------------------------------------------------------------
-- 4. SCAPI REQUESTS
-- ----------------------------------------------------------------------------
-- Table: warehouse.ccdw_aggr_scapi_request
-- Filtre: request_date
-- Buckets: num_requests_bucket1 a bucket11 pour distribution temps de reponse

SELECT
  site_id,
  request_date,
  api_resource,
  api_name,
  api_version,
  method,
  status_code,
  num_requests,
  response_time,
  num_requests_bucket1,
  num_requests_bucket2,
  num_requests_bucket3,
  num_requests_bucket4,
  num_requests_bucket5,
  num_requests_bucket6,
  num_requests_bucket7,
  num_requests_bucket8,
  num_requests_bucket9,
  num_requests_bucket10,
  num_requests_bucket11
FROM warehouse.ccdw_aggr_scapi_request
WHERE request_date >= '{start_date}' AND request_date < '{end_date}';


-- ----------------------------------------------------------------------------
-- 5. OCAPI REQUESTS
-- ----------------------------------------------------------------------------
-- Table: warehouse.ccdw_aggr_ocapi_request
-- Filtre: request_date
-- Note: Inclut client_id en plus des colonnes SCAPI

SELECT
  site_id,
  request_date,
  api_resource,
  client_id,
  api_name,
  api_version,
  method,
  status_code,
  num_requests,
  response_time,
  num_requests_bucket1,
  num_requests_bucket2,
  num_requests_bucket3,
  num_requests_bucket4,
  num_requests_bucket5,
  num_requests_bucket6,
  num_requests_bucket7,
  num_requests_bucket8,
  num_requests_bucket9,
  num_requests_bucket10,
  num_requests_bucket11
FROM warehouse.ccdw_aggr_ocapi_request
WHERE request_date >= '{start_date}' AND request_date < '{end_date}';


-- ----------------------------------------------------------------------------
-- 6. PROMOTION ACTIVATIONS
-- ----------------------------------------------------------------------------
-- Table: warehouse.ccdw_aggr_promotion_activation
-- Filtre: activation_date

SELECT
  site_id,
  activation_date,
  device_class_code,
  registered,
  promotion_id,
  campaign_id,
  locale_code,
  num_visits,
  num_activations
FROM warehouse.ccdw_aggr_promotion_activation
WHERE activation_date >= '{start_date}' AND activation_date < '{end_date}';


-- ----------------------------------------------------------------------------
-- 7. PROMOTION LINE ITEMS
-- ----------------------------------------------------------------------------
-- Table: warehouse.ccdw_fact_promotion_line_item
-- Filtre: std_submit_timestamp
-- Note: Table volumineuse - filtre obligatoire

SELECT
  site_id,
  std_submit_timestamp,
  promotion_id,
  promotion_line_item_id,
  coupon_id,
  std_li_gross_merchandise_value
FROM warehouse.ccdw_fact_promotion_line_item
WHERE std_submit_timestamp >= '{start_date}' AND std_submit_timestamp < '{end_date}';


-- ============================================================================
-- FIN DES REQUETES
-- ============================================================================
--
-- RESUME DES TABLES ET FILTRES:
-- +---------------------------------------------+----------------------+
-- | Table                                       | Colonne filtre       |
-- +---------------------------------------------+----------------------+
-- | warehouse.ccdw_dim_site                     | (aucun)              |
-- | warehouse.ccdw_aggr_controller_request      | request_date         |
-- | warehouse.ccdw_aggr_include_controller_request | request_date      |
-- | warehouse.ccdw_aggr_scapi_request           | request_date         |
-- | warehouse.ccdw_aggr_ocapi_request           | request_date         |
-- | warehouse.ccdw_aggr_promotion_activation    | activation_date      |
-- | warehouse.ccdw_fact_promotion_line_item     | std_submit_timestamp |
-- +---------------------------------------------+----------------------+
--
-- NOTE: Pour chaque realm, creer une connexion JDBC separee avec l'URL:
-- jdbc:salesforcecc://jdbc.analytics.commercecloud.salesforce.com:443/{realm}_prd
--
---- ============================================================================
