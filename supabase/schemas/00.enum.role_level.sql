/** How much a role may do within one app, from least to most privileged. */
create type public.role_level as enum('viewer', 'editor', 'admin');
