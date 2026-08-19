-- The API protocol an `api_resource` catalog entry speaks, not the host that
-- serves it. HDX is a CKAN deployment, and any other CKAN is reached by the
-- same client, so the protocol is what selects the code path while
-- `api_base_url` selects the instance.
create type public.catalog_entries__open_data__api_service as enum('ckan');
