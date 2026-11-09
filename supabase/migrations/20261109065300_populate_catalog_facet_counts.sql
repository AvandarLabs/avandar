-- Counts the catalog into `data_catalog_facet_counts`, which the previous
-- migration creates empty. Pipeline runs keep it current from here, through
-- `rpc_pipeline_executions__finish`.
do $$
begin
  perform public.data_catalog_facet_counts__refresh ();
end;
$$;
