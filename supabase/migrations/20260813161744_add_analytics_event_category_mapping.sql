set check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.usage_analytics_events__set_category()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.event_category := public.util__analytics_event_category(new.event_name);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__analytics_event_category(p_event_name text)
 RETURNS public.usage_analytics_events__category
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select (
    case p_event_name
      -- acquisition
      when 'waitlist.code_verified' then 'acquisition'
      when 'waitlist.code_claimed' then 'acquisition'
      when 'user.registered' then 'acquisition'
      when 'user.email_confirmed' then 'acquisition'
      -- activation
      when 'workspace.created' then 'activation'
      when 'dataset.imported' then 'activation'
      when 'query.ran' then 'activation'
      when 'dashboard.published' then 'activation'
      -- engagement
      when 'user.signed_in' then 'engagement'
      when 'chat.message_sent' then 'engagement'
      when 'chat.sql_generated' then 'engagement'
      when 'chat.turn_completed' then 'engagement'
      when 'chat.turn_failed' then 'engagement'
      when 'dashboard.block_added_via_chat' then 'engagement'
      when 'dashboard.filter_changed' then 'engagement'
      when 'dashboard.share_settings_updated' then 'engagement'
      when 'dashboard.pdf_export_opened' then 'engagement'
      when 'dashboard.pdf_exported' then 'engagement'
      when 'query.failed' then 'engagement'
      -- expansion
      when 'workspace.invite_sent' then 'expansion'
      when 'workspace.invite_accepted' then 'expansion'
      when 'member.removed' then 'expansion'
      when 'dashboard.public_viewed' then 'expansion'
      -- revenue
      when 'subscription.created' then 'revenue'
      when 'subscription.plan_changed' then 'revenue'
      when 'subscription.status_changed' then 'revenue'
      else 'other'
    end
  )::public.usage_analytics_events__category;
$function$
;

CREATE TRIGGER tr__usage_analytics_events__set_category BEFORE INSERT ON public.usage_analytics_events FOR EACH ROW EXECUTE FUNCTION public.usage_analytics_events__set_category();

