-- Create function to update `updated_at` column of a table
create or replace function public.util__set_updated_at()
returns trigger as $$
  begin
    new.updated_at = (now() at time zone 'UTC');
    return new;
  end;
$$
language plpgsql;