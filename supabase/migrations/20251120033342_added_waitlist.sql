create table "public"."waitlist_signups" (
  "id" uuid not null default gen_random_uuid(),
  "email" text not null,
  "created_at" timestamp with time zone not null default now(),
  "signup_code" text not null,
  "code_is_used" boolean not null default false
);

create unique index waitlist_signups_email_key on public.waitlist_signups using btree (email);

create unique index waitlist_signups_pkey on public.waitlist_signups using btree (id);

create unique index waitlist_signups_signup_code_key on public.waitlist_signups using btree (
  signup_code
);

alter table "public"."waitlist_signups"
add constraint "waitlist_signups_pkey" primary key using index "waitlist_signups_pkey";

alter table "public"."waitlist_signups"
add constraint "waitlist_signups_email_key" unique using index "waitlist_signups_email_key";

alter table "public"."waitlist_signups"
add constraint "waitlist_signups_signup_code_key" unique using index "waitlist_signups_signup_code_key";

grant delete on table "public"."waitlist_signups" to "anon";

grant insert on table "public"."waitlist_signups" to "anon";

grant references on table "public"."waitlist_signups" to "anon";

grant
select
  on table "public"."waitlist_signups" to "anon";

grant trigger on table "public"."waitlist_signups" to "anon";

grant
truncate on table "public"."waitlist_signups" to "anon";

grant
update on table "public"."waitlist_signups" to "anon";

grant delete on table "public"."waitlist_signups" to "authenticated";

grant insert on table "public"."waitlist_signups" to "authenticated";

grant references on table "public"."waitlist_signups" to "authenticated";

grant
select
  on table "public"."waitlist_signups" to "authenticated";

grant trigger on table "public"."waitlist_signups" to "authenticated";

grant
truncate on table "public"."waitlist_signups" to "authenticated";

grant
update on table "public"."waitlist_signups" to "authenticated";

grant delete on table "public"."waitlist_signups" to "service_role";

grant insert on table "public"."waitlist_signups" to "service_role";

grant references on table "public"."waitlist_signups" to "service_role";

grant
select
  on table "public"."waitlist_signups" to "service_role";

grant trigger on table "public"."waitlist_signups" to "service_role";

grant
truncate on table "public"."waitlist_signups" to "service_role";

grant
update on table "public"."waitlist_signups" to "service_role";
