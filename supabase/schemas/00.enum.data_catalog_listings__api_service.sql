/**
 * The API protocol an `api_resource` catalog listing speaks, not the host
 * that serves it. HDX is a CKAN deployment and any other CKAN is reached by
 * the same client, so the protocol selects the code path while
 * `api_base_url` selects the instance. Socrata is a second such protocol:
 * many open-data portals (data.cdc.gov among them) run Socrata instead of
 * CKAN, and the same reasoning applies, one client per protocol,
 * `api_base_url` per instance.
 */
create type public.data_catalog_listings__api_service as enum('ckan', 'socrata');
