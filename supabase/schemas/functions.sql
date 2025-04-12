-- Create function to update `updated_at` column of a table
create or replace function public.update_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
        new.updated_at = (now() at time zone 'UTC');
        return new;
    end;
    $$;