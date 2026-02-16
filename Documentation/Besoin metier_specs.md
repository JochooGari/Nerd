NERD : NGL Environments Reliability Dashboard
Créé par PIERRON Cyril, dernière modification le déc. 15, 2025
Introduction
Key Performance Indicators
MVP Technical Specifications
Overview
Initial Assumptions
Infrastructure
How To Get Information From B2C
Autentication and Authorization
OCAPI Configuration
Data API - Global Context
On-Demand Sandbox (ODS) API Configuration
Retrieving Data From The Logs
Data Volumetry (MVP)
Data Specifications
Data Model
Realm - Zone Mapping Table
Static Data
Monitored Data
Lot 2: Technical Specification
LCNC Assessment
Introduction
The purpose of the NERD project is to define and setup a technical cockpit to "take the pulse" of all the Salesforce B2C realms worldwide. The intent is to show a set of Key Performance Indicators (KPI) to detect and monitor any deviation from standard operations (quota breaches, drop in performance server side, ...).

The cockpit is a separate project from the Quality Gates or the Feature Tracker. It's not intended to duplicate any indicator from those projects.

Key Performance Indicators
The list of KPIs selected for the NERD project as a MVP is defined in the file below:

NERD - Dashboard Tech WIP.xlsx

MVP Technical Specifications
Overview


The cockpit will be composed of 2 main layers:

A frontend i.e. the interface of the cockpit itself which is basically a dasboard showing a status of the realms at a glance.
The design of the cockpit should better be put in the hands of a specialist (i.e. a designer) to organise and display the data in an efficient and "consumable" way.
Typical open questions to tackle:
Should we show all realms at once (~ 10-20 realms), if so what is the main data set that should be displayed for each realms (we probably can't display all the data for all realms at once)?
=> For instance Thibault would like to see a world map with the all the realms positioned according to their location and the number of sites per realm (i.e. high level dashboard).
Should we rather foresee one page / tab per realm (a realm details page) with a kind of a summary home page of the main indicators for all realms (the main KPI remain to be determined depending on what is acceptable from a design standpoint)? => What do we want to compare accross realms?
=> What information are necessary to get a good overview of a realm operational status that could be used as an introduction topic to weeklys with zone architects?
How about monitoring? It would be interesting (necessary? second step?) to display historical data and show how do the KPI evolve throughout time
=> Particularly true with performance indicators
A backend
The backend will be in charge of collecting and storing the data.
Initial Assumptions
The frontend will be designed in PowerBI
The backend is expected to be implemented in javascript (i.e. nodejs)
Note: we are currently investigating PowerAutomate

Infrastructure
The backend script will run in Jenkins for automation. We will revisit this approach in favor of Github Actions once we have migrated to Github (from Atlassian Bitbucket).

Note: Github Actions may not be the best place to orchestrate tasks (although it provides a scheduler). We are looking into PowerAutomate capabilities.

Database options could rely either on Microsoft Azure or Google Cloud Platform (GCP).

The (loose) recommendation is as follows:

If PowerBI is favored go for Azure (although note that PowerBI can connect to GCP or JDBC Drivers i.e. the recommendation is indeed "loose").
If LookerStudio is preferred go for GCP (BigQuery ?).
GCP is also recommended if any AI data analysis is foreseen => no AI in scope, NERD is just a dashboard
There is always the option of designing a custom interface. The initial hypothesis is that PowerBi would be used for the frontend interface and reporting.

Note: while the storage target remains to be cracked (Azure vs GCP vs ??), we could foresee a "pragmatic" approach in a Proof Of Concept mode: store the data in a flat file as we did for the Quality Gates. As long as the data model doesn't change, in PowerBi it is just a matter of switching the data source (i.e. from flat file to DB).

After discussion with the team, it's been concluded that no DB wa necessary for the MVP as the volume of data is limited compared to the capabilities of PowerBI. As a consequence the main data files for the MVP will simply be stored on Sharepoint for a start:

https://loreal.sharepoint.com/:f:/r/sites/-FR-GLOBALD2CITTEAM/Documents%20partages/General/04.%20TRANSVERSAL%20PROJECTS/20.%20NERD%20-%20%20NGL%20Environments%20Reliability%20Dashboard/Data?csf=1&web=1&e=ksqNhr

How To Get Information From B2C
The information can be extracted from B2C in a few ways:

Ideally it should be exposed through an API which can be either:
B2C Open Commerce API (OCAPI)
Salesforce Commerce API (SCAPI)
On-Demand Sandbox (ODS) API: On-Demand Sandboxes | Get Set Up | B2C Commerce | Salesforce Developers
Also check B2C Commerce Developer Sandbox REST API Swagger
Salesforce Commerce Cloud CLI
Information may be extracted from B2C logs
However this is a much less convenient approach as it requires to retrieve and parse many logs files.
Such an approach could be applicable to:
Quota logs (Salesforce is investigating if there is a better approach as some of their customer may already have developped such quota dashboard)
Deprecations logs
If the required information isn't available by any other mean, custom B2C script may be required to extract and store the data in some way (through custom objects, flat files, ...).
In August 2025 (with release 25.8), Salesforce started to officially expose CCAC business and technical reports and dashboards through a JDBC driver.
This is opens a wide flow of data that can be leveraged in NERD to compare realm performances (like controller response time, caching efficiency, ...)
Check Salesforce documentation: B2C Commerce Intelligence JDBC Driver, B2C Commerce Data Lakehouse Schema Reference as well as the driver source code.
It must be highlighted that unfortunately Salesforce CLI API is NOT documented as the API isn't considered by SF as a product. However it's extensively used in a couple projects which can be used as a basis to better understand the API capabilities:

ecom-tools-ods (nodejs based)
Suzanne (GO based)
Autentication and Authorization
Accessing the various APIs may require different access keys (potentially per realm as typically in the case of SCAPI Shopper AI).

Also note that as we intend to access B2C WebDAV at least to retrieve the current NGL version, we will require one account and one access key associated with that account for each production instance!

OCAPI Configuration
In the context of the tests the following key has been used: 51d065eb-bba5-49d2-b240-ffde05a095e8 (called sfcc-osf-dev-OCAPI)

The following configuration needs to be set up in the Business Manager (Administration > Site Development >  Open Commerce API Settings)

Data API - Global Context
{
    "_v": "25.6",
    "clients":
    [
        {
            "client_id": "51d065eb-bba5-49d2-b240-ffde05a095e8",
            "resources":
            [
                {
                    "resource_id": "/sites/**",
                    "methods":
                    [
                        "get"
                    ],
                    "read_attributes": "(**)"
                },
                {
                    "resource_id": "/code_versions",
                    "methods":
                    [
                        "get"
                    ],
                    "read_attributes": "(**)"
                },
                {
                    "resource_id": "/sites/*/promotion_search",
                    "methods":
                    [
                        "post"
                    ],
                    "read_attributes": "(**)",
                    "write_attributes": "(**)"
                },
                {
                    "resource_id": "/sites/*/coupon_search",
                    "methods":
                    [
                        "post"
                    ],
                    "read_attributes": "(**)",
                    "write_attributes": "(**)"
                }
            ]
        }
    ]
}
On-Demand Sandbox (ODS) API Configuration
The interface to the ODS API will be managed through Salesforce CLI.

The API Key ac0da8c1-a3a9-4d09-9f9e-8601e4cf9dbb called 'GLOBAL - On-Demand Sandbox API' in the Account Manager can be reused for authentication and authorization

Note: it's more secure to define a separate key, to be discussed with Arthur => we will create a dedicated key.

Generally speaking the necessary information can be retrieved either by calling the ODS API or by using sfcc-ci which ultimately calls the ODS API anyway. Considering that sfcc-ci hardcodes some parameters (for instance the 'from' in the getRealm function), using the API directly is preferred.

Retrieving Data From The Logs
There are some information that aren't exposed through API or CLI but that could be retrieved by parsing B2C log files.

In particular:

Quota Status
Deprecation API Usage
This requires some dedicated access to B2C WebDAV.

Data Volumetry (MVP)
Salesforce contracts are usually signed for a 3 years period.

ODS data will be "historized" for the duration of the contract and reset at the signature of a new contract.

We may store one record per realm and per day of the Monitored Data structure detailed later in this specification.

Note that the realm and ods data may be split into different tables, joined based on the realm id.

In terms of DB records this represents 365 records x 3 years x 13 realms = 14 235 records over 3 years.

This leaves quite some room if more realms are added or the record frequency updated.

Volumetry should not be a major concern with regards to data storage and database size.

This will need to be revisited when Salesforce CCAC data will be gathered.

Data Specifications
Definition	Data Type	Sample
Value	Frequency	
Historicize

vs Static

API	Details	Comments
General Realm Data

 

Realm zone	String	emea	daily	
historicize



This requires to maintain a mapping table to match the realm IDs to a L'Oreal' zone (excluding test realms).

Save the resulting string value to a realm object in the zone property (refer to the Data Model).

aafm	amer	canada-loreal
aang	amer	lora-loreal
aatl	amer	latam-loreal
bjrm	amer	na01-saloncentric
bldd	amer	
aaqp	emea	emea-loreal
bhhx	emea	eu15-lorealsa
bdcr	global	eu03-lorealsa
aarm	na-sapmena	cn-loreal
bckq	na-sapmena	jp-loreal
bgsj	na-sapmena	eu11-lorealsa
bfzm	na-sapmena	ap12-lorealsa
aawh	na-sapmena	apac-loreal
References:

Americas - Realm Site Mapping
APAC Realms information
This information will be maintained as a separate "static" data source (i.e. a separate DB table or JSON file for a start)

Realm region

Realm country

Realm city

String

String

String

eu-west

Ireland

Dublin

daily

daily

daily

historicize

historicize

historicize

ODS,

IP-API

GET request to /realms/{realm}/system

The region is accessible via the data.region property of the API response.

Save the resulting string value to a realm object in the region property (refer to the Data Model).

We can indirectly get the country and city of a realm from the data.outboundIps property of the API response by using an IP Geolocation service.

Save the resulting string values to a realm object respectively in the country and city properties (refer to the Data Model).

Check the IP-API service which allows for up to 45 requests / minute for free to retrieve an IP geolocation

Realm Compatibility Mode

Realm cartridges list

NGLora version

String

Array of String

String

22.7

[ "app_base", ... ]

76.2.0

daily

daily

daily

historicize

historicize

historicize

OCAPI Data

GET request to /code_versions

filter out the results to get the current active code version: response.data[n].active === true

Save the following informations (refer to the Data Model):

response.data["active" === true].compatibility_mode to a realm object in the compatibility_mode property
response.data["active" === true].cartridges to a realm object in the cartridges property
With response.data["active" === true].id representing the code version it's possible to access the files resulting from the built process on B2C's WebDAV:

For instance on the staging instance:

https://staging-eu03-lorealsa.demandware.net/on/demandware.servlet/webdav/Sites/Cartridges/b1039_20250825_staging

with b1039_20250825_staging being the current code version (retrieved from the OCAPI call).

The files below (depending on the build process, SystemJS vs Rollup) can be parsed to retrieve the current NGLora version:

Sites/Cartridges/b1039_20250825_staging/ui_lora/cartridge/static/default/dist/javascripts/main.js
Sites/Cartridges/b1039_20250825_staging/ui_lora/cartridge/static/default/dist/js-rl/app.js

Save the resulting string value to a realm object in the ngl_version property (refer to the Data Model).

While the NGLora version is a site information, there is only one active code version at any time on an instance. NGL code is shared by all sites on production. From this standpoint the NGL version can be considered as a realm data (focusing on the production instance).

Beware that accessing B2C WebDAV will require an account and an access key for each realm!

Number of sites

Site List

Integer

Array of String

12

[ "NGLora", ... ]

daily

daily

historicize

historicize

OCAPI Data

GET /sites

The number of sites is accessible via the total property of the API response.

Save the resulting number value to a realm object in the nb_sites property (refer to the Data Model).

Save all the sites IDs, from the data[n].id properties of the API response, as an array of string to a realm object in the sites property (refer to the Data Model).

If necessary additional information about each site can be retrieved by calling:

GET /sites/{site_id}

It could be useful to refine the list according to some value like the online status or whatever (although I assume on production all sites are supposed to be online).

We could also show more information about the sites (display_name, ...). 

By default calling /sites returns 25 results (pagination applies), unless count is set as a URL pamaterer.
On B2C an object quota set to 100 limits the number of sites on an instance. We may set count=100 by default to get all site results at once avoiding further paginated calls.

Number of promotions	Integer	95	daily	
historicize

OCAPI Data

POST /sites/{site_id}/promotion_search

This requires to loop through all the sites and aggregate the result per site, then sum it all up to get the total for the production instance.

Beware the endpoint returns a maximum of 200 hits without pagination (if count is set in the request payload to 200).

In other words we may have to call the endpoint several times until the number of hits returned is lower to the payload's count parameter.

The payload below can be used - basically not filtering (refer to the POSTMAN collection provided):

{
    "count": 200,
    "db_start_record_": 0,
    "query": { "match_all_query": {} },
    "select": "(count)",
    "start": 0
}
If the endpoint has to be called several times (i.e. if the number of promotions for a site is > 200 in the example above), on the next call, set start to 200, then 400, ...

Algorithm:

set variable sum = 0
for each site {
    while (number of hits count returned = payload count value) {
        sum += number of hits count returned
    }
}
Save the aggregated value for all sites to a realm object in the quotas.nb_promotions property (refer to the Data Model).

Relies on getting the list of sites first.

 Number of active promotions	Integer	89	daily	
historicize

OCAPI Data

POST /sites/{site_id}/promotion_search

This requires to loop through all the sites and aggregate the result per site, then sum it all up to get the total for the production instance.

Beware the endpoint returns a maximum of 200 hits without pagination (if count is set in the request payload to 200).

In other words we may have to call the endpoint several times until the number of hits returned is lower to the payload's count parameter.

The payload below can be used - basically filtering on the promotion being enabled (refer to the POSTMAN collection provided):

{
    "count": 200,
    "db_start_record_": 0,
    "query": {
        "filtered_query": {
            "query": { "match_all_query": {} },
            "filter": {
                "term_filter": {
                    "field": "enabled",
                    "operator": "is",
                    "values": [true]
                }
            }
        }
    },
    "select": "(count)",
    "start": 0
}
If the endpoint has to be called several times (i.e. if the number of promotions for a site is > 200 in the example above), on the next call set start to 200, then 400, ...

Algorithm:

set variable sum = 0
For each site {
    while (number of hits count returned = payload count value) {
        sum += number of hits count returned
    }
}
Save the aggregated value for all sites to a realm object in the quotas.nb_active_promotions property (refer to the Data Model).

Relies on getting the list of sites first.

Number of coupons	Integer	44	daily	
historicize

OCAPI Data

POST /sites/{site_id}/coupon_search

This requires to loop through all the sites and aggregate the result per site, then sum it all up to get the total for the production instance.

Beware the endpoint returns a maximum of 200 hits without pagination (if count is set in the request payload to 200).

In other words we may have to call the endpoint several times until the number of hits returned is lower to the payload's count parameter.

The payload below can be used (refer to the POSTMAN collection provided):

{
    "count": 200,
    "db_start_record_": 0,
    "query": { "match_all_query": {} },
    "select": "(count)",
    "start": 0
}
If the endpoint has to be called several times (i.e. if the number of coupons for a site is > 200 in the example above) on the next call set start to 200, then 400, ...

Corresponding algorithm

set variable sum = 0
For each site {
    while (number of hits count returned = payload count value) {
        sum += number of hits count returned
    }
}
Save the aggregated value for all sites to a realm object in the quotas.nb_coupons property (refer to the Data Model).

Relies on getting the list of sites first.

Number of active coupons	Integer	44	daily	
historicize

OCAPI Data

POST /sites/{site_id}/coupon_search

This requires to loop through all the sites and aggregate the result per site, then sum it all up to get the total for the production instance.

Beware the endpoint returns a maximum of 200 hits without pagination (if count is set in the request payload to 200).

In other words we may have to call the endpoint several times until the number of hits returned is lower to the payload's count parameter.

The payload below can be used (refer to the POSTMAN collection provided):

{
    "count": 200,
    "db_start_record_": 0,
    "query": {
        "filtered_query": {
            "query": { "match_all_query": {} },
            "filter": {
                "term_filter": {
                    "field": "enabled",
                    "operator": "is",
                    "values": [true]
                }
            }
        }
    },
    "select": "(count)",
    "start": 0
}
If the endpoint has to be called several times (i.e. if the number of coupons for a site is > 200 in the example above) on the next call set start to 200, then 400, ...

Corresponding algorithm

set variable sum = 0
For each site {
    while (number of hits count returned = payload count value) {
        sum += number of hits count returned
    }
}
Save the aggregated value for all sites to a realm object in the quotas.nb_active_coupons property (refer to the Data Model).

Relies on getting the list of sites first.

ODS Management


Limits enabled

Max Number of ODS

Org Credit Balance

Active Sandboxes

Boolean

Number

Float

Number

true / false,

300

620106944.7

54

daily

daily

hourly

hourly

historicize

historicize

static

static

ODS

GET request to /realms/{realm}

First check the value of the data.configuration.sandbox.limitsEnabled property of the API response.

Save the boolean value to an ods object in the limits_enabled property (refer to the Data Model).

If true get the value from the data.configuration.sandbox.totalNumberOfSandboxes property of the API response.

Save integer value to an ods object in the max_nb_ods property (refer to the Data Model).

If false set the max_nb_ods property value to 0 (refer to the Data Model).

Save the value of the data.accountdetails.creditBalance property of the API response to the org_credits property of the realm static data (refer to the Static Data).

Save the value of the data.usage.activeSandboxes property of the API response to the active_ods property of the realm static data (refer to the Static Data).

Note: if we want to retrieve only the number of current active sandbox hourly (or at least more regularly) then only ?expand=usage is necessary.

Similarly ?expand=accountdetails is sufficiant to get the credit organization credit balance



The API returns the number of active ODS running at the time of the API call. It's not the number of ODS created on the realm (overall). ODS which are currently stopped (potentially due to their schedule) aren't accounted for.

All information should be retrieved at once with just one API call by setting the expand parameter as below:

?expand=configuration,usage,accountdetails

Beware, when using the --show-usage option, the CLI actually calls /realms/{realm}/usage with the following hardcoded query parameter:
'?from=2019-01-01'

In other words the created, active and deleted sandbox values correspond to operations since Jan 1st, 2019! It doesn't reflect the current number of created sandbox.

ODS Data	

daily	




GET request to /sandboxes

Filter the returned JSON structure per response.data[n].realm

Regroup the ODS data per response.data[n].resourceProfile (possible values: medium, large, xlarge with a possible upcoming xxlarge).

If a resource profile isn't found the corresponding JSON object in the target data structure still needs to be created.

For each profile count and aggregate the number of sandboxes per response.data[n].state (possible values: started, stopped).

If a state value isn't found for a particular profile, set the corresponding value in the target data structure to 0.

For each profile count and aggregate the number of sandboxes per response.data[n].autoScheduled (possible values: either true, or undefined).

If a autoScheduled value isn't found for a particular profile, set the corresponding value in the target data structure to 0.

Please refer to the resource_profiles property in the target data structure to understand how to format the output data.

Unfortunately this request returns the list of all the sandboxes for all the realms the access key is configured with. I haven't found a way to filter the response per realm.

Should we also get data for the deleted sandboxes ?

Note: although not documented in the Swagger, the API supports a sortBy=realm parameter (it shows up in the code of sfcc-ci).

ODS Consumption



Minutes Up & Minutes Down (per profile)

Total Minutes Up

Total Minutes Down

Total Credits Up

Total Credits Down

Object

Number

Number

Number

Float



69559

2391

83906

719.1

daily

daily

daily

daily

daily

historicize

historicize

historicize

historicize

historicize

ODS

GET request to /realms/{realm}/usage?from=2024-02-01&to=2024-02-01&granularity=daily&detailedReport=false

This API will be called everyday to retrieve the information from the past (full) day of operation (i.e. 24h data delay).

As a consequence the from and to URL parameters should be set to the same value in the format YYYY-MM-DD (for instance 2025-09-12).

Similarly the granularity must be set to daily and the detailedReport shouldn't be necessay (assuming we trust SF credit calculations).

Map the data.minutesUpByProfile object property of the API response into the minutes_up_by_profile object property of an ods object (refer to the Data Model).

Save the data.minutesUp and data.minutesDown properties of the API response to an ods object respectively in the total_minutes_up and total_minutes_down properties (refer to the Data Model).

Save the data.granularUsage.creditsUp and data.granularUsage.creditsDown properties of the API response to an ods object respectively in the credits_up and credits_down properties (refer to the Data Model).

node cli.js sandbox:realm:list --realm bdcr --json --show-usage
This information is available over a date range. We need to determine the frequency at wich the information will be retrieved and associated granularity => daily

This request gives us the consumption per realm and opens the possibility to compare realms in terms of consumptions.

Note: all data retrieved from the /realms/{realm}/usage endpoint should be gathered with just one API call setting the from, to and granularity parameters.

Beware, when using the --show-usage option, the CLI actually calls /realms/{realm}/usage with the following hardcoded query parameter:
'?from=2019-01-01'

In other words the created, active and deleted sandbox values correspond to operations since Jan 1st, 2019! It doesn't reflect the current number of created sandbox.

Data Model
The data model available to PowerBI should be structured as described in this section.

Data may be split into several sources (from PowerBi standpoint). As a starting point the sources will be represented by separate JSON objects / files.

Data can be:

Static (current value only, no history, just overwrite in case of update), like for instance:
Mapping data tables (i.e. the table mapping realms to zones, a similar mapping will be necessary for the quotas)
"Real time" data destined to show the current situation without the need for monitoring
Saved / Historicized (enabling monitoring through time), potentially updated less regularly (set to daily actually).
The JSON objects represent data at realm level (except for the credit value which is at the org level).

When some data are related to an instance or a site we focus on the production instance of the target realm.

Realm - Zone Mapping Table
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
{
    "amer": [
        "aafm",
        "aang",
        "aatl",
        "bjrm",
        "bldd"
    ],
    "emea":[
        "aaqp",
        "bhhx"
    ],
    "global": [
        "bdcr"
    ],
    "na-sapmena": [
        "aarm",
        "aawh",
        "bckq",
        "bgsj",
        "bfzm"
    ]
}

Static Data
static.json file, representing "live" data for which we want to get a current status without the need to keep track throughout time. This information could be refreshed very regularly.

[
    {
        "realm_id": "bdcr",
        "org_credits": 620106944.7,
        "active_ods": 54,
        "resource_profiles":
        {
            "medium":
            {
                "started": 42,
                "stopped": 2,
                "scheduled": 14
            },
            "large":
            {
                "started": 7,
                "stopped": 0,
                "scheduled": 1
            },
            "xlarge":
            {
                "started": 5,
                "stopped": 0,
                "scheduled": 0
            }
        }
    },
    {
      "realm_id": "bdcr",
      ...
    },
    ...
]
Monitored Data
These data will be retrieved daily and must be kept (historicized). They will be split into 2 files realms.json and ods.json.

The JSON files represent separate database tables. Each array element in the JSON is essentially a database record in its respective table.

The tables can be joined according to the realm_id and date fields.

Salesforce contracts are enforced for 3 years. The ODS data must be stored for up to 3 years and reset when a new contract is signed.

The current contract was enforced on February 1st, 2024, allocating L'Oreal organization with 950.700.00 credits (950.7 million).

realms.json file:

[
    {
        "realm_id": "bdcr",
        "date": "2024-02-01",
        "zone": "na-sapmena",
        "region": "eu-west",
        "country": "Ireland",
        "city": "Dublin",
        "compatibility_mode": "22.7",
        "cartridges":
        [
            "app_account",
            "app_autoreplenishment",
            "app_base",
            ...,
            "ui_lora"
        ],
        "ngl_version": "77.4.0",
        "nb_sites": 12,
        "sites":
        [
            "NGLora",
            "NGLancome-ILM",
            "NGBiotherm-ILM",
            ...
        ],
        "quotas":
        {
            "nb_promotions": 95,
            "nb_active_promotions": 89,
            "nb_coupons": 44,
            "nb_active_coupons": 44
        }
    },
    {
        "realm_id": "aaqp",
        "date": "2024-09-23",
        ...
    },
    ...
]


ods.json file:

[
    {
        "realm_id": "bdcr",
        "date": "2024-02-01",
        "limits_enabled": true,
        "max_nb_ods": 300,
        "minutes_up_by_profile":
        {
            "medium": 60946,
            "large": 5742,
            "xlarge": 2871,
            "xxlarge": 0
        },
        "total_minutes_up": 69559,
        "total_minutes_down": 2391,
        "credits_up": 83906,
        "credits_down": 719.1
    },
    {
        "realm_id": "aaqp",
        "date": "2024-07-13",
        ...
    },
    ...
]
Lot 2: Technical Specification
The data will be retrieved from the JDBC Driver that has been setup by the data team. Main contact: elias.tanios@loreal.com

While the Business data are already considered in the context of the JDBC Driver (those data being pushed to the SDDS), technical data are not taken into account. The idea is to push the daily csv to an Azure Storage Account Subscription so PowerBI can access it there.

The following have been created:

Storage Account: https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Storage/storageAccounts/nerdsa/overview
Function App: https://portal.azure.com/#@loreal.onmicrosoft.com/resource/subscriptions/4f9e0041-217a-4c42-807c-bf6acb8e7aa0/resourcegroups/NE-GBT-RG-NERD/providers/Microsoft.Web/sites/nerdmvp/users
Azure Storage REST API Reference

LCNC Assessment



Workflow & Orchestration	Number of steps, approval and complexity	We may need several flows, depending on the target endpoint and the frequency at which we need to refresh data. The flows are intended to be fully automated or orchestrated with a scheduler. No approval required. The flows should be rather simple and straightforward
Number and type of Task generated (Manual / API / RPA)	Most of what we need will be retrieved through API (described above). However some data are currently not exposed through API. We may need to parse some B2C logs (hosted on a webdav instance) to extract the missing pieces. We are looking for alternatives to simplify the approach.
Data Sources	Is data stored persistently?	Yes we intend to monitor deviation through time thus the data we gather will need to be stored persistently.
Does the application update the source database? -- manually or automatically	Yes the database will need to be updated when data are collected. However we foreseen to start with a rather flat data structure which could be saved to file (i.e. json). To collect the data from B2C we only need a read access mode.
Volume of record / request by months (years)	At the beginning most of the data will be collected daily. Also a lot of the data will be retrieved through a single API call resulting in a single write to the database. Even though we decided to collect data more regularly, the information isn't critical enough that we need to get it more frequently than every 4 hours. Thus worst case scenario at the begining is about 50 records per week. This leaves a lot of room even if we add more data to the dashboard.
Security & Regulations	Is there any regulation your application must comply with? If yes, please indicate which ones.	There will be absolutely no personnal information collected. The data isn't supposed to be publicaly exposed and should remain within L'Oreal realm.
Does the application acquire/process/store personal data?	No
What is the level of Confidentiality of your app / workflow?	C1
Is this app developed by an external provider? (not in PSL / without L'Oreal account)	We'll most certainly rely on a partner to develop the PowerBI Dashboard as we don't have the competencies internally. The partner will be under contract with L'Oreal
User Base	How many users are using this solution?	The PowerBI Dashboard can be mostly freely available with L'Oreal O+O D2C Global team. The application will be fully automated, thus limited acces to PowerAutomate is required.

Select the type of users involved:	L'Oreal O+O D2C Global team
UX & Analytics	Advanced Reporting & Dashboarding	Yes the target is to use PowerBI
Required advance UI / Mobile application	No
Scalability	Required to scale across Countries/Markets/Zones/Group ?	The target remains L'Oreal O+O D2C Global team, however the zone IT could have access to the PowerBi Dashboard if they want to. This should have no impact on the flows which sole purpose are to collect data in a scheduled way.
Is standalone or part of an existing Application / Process ?	standalone


J'aimeSoyez le premier à aimer ça
Aucune étiquetteModifier les étiquettes
4 commentaires
emilien.huet@loreal.com
HUET Emilien - MALT COMMUNITY dit :
juil. 21, 2025 
> Number of unscheduled ODS

> Filter the list per realm, then look for the sandbox with the property autoScheduled set to true

Do we want the scheduled ODS or the unscheduled ones?

RépondreJ'aime
cyril.pierron@loreal.com
PIERRON Cyril dit :
juil. 21, 2025 
Actually both so we can get a ratio of scheduled vs unscheduled.

RépondreJ'aimeHUET Emilien - MALT COMMUNITY aime ça
emilien.huet@loreal.com
HUET Emilien - MALT COMMUNITY dit :
août 14, 2025 
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
    },
}
We are fetching the "minutesUpByProfile" metric which gives us this response:

"minutesUpByProfile": [
  {
    "profile": "medium",
    "minutes": 3154931
  },
  {
    "profile": "large",
    "minutes": 461195
  },
  {
    "profile": "xlarge",
    "minutes": 231575
  }
],
Should we add these numbers to resource_profiles ?

RépondreJ'aime
cyril.pierron@loreal.com
PIERRON Cyril dit :
août 18, 2025 
Hello HUET Emilien - MALT COMMUNITY that's the part I still need to think through as the minutes indicated depend on the from/to in the request. In this case we may also need to store the last interval concerned. I'll resume thinking about that this week and that's something I also intend to discuss with the person who'll deal with PowerBI (i.e. how to store this in the datamodel and in which format) slightly smiling face 

