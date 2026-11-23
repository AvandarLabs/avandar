/**
 * Where an activity event came from.
 *
 * Enum values:
 *
 * `avandar` - A change made in Avandar.
 * `external` - History pulled from a connected third-party service.
 */
create type public.activity_events__source as enum('avandar', 'external');
