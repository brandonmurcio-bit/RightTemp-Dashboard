-- Public landing-page attribution and private Web Push infrastructure.
-- Anonymous users never receive direct table access; public writes go through
-- the rate-limited capture-lead Edge Function.

alter table public.leads
  add column if not exists urgency text,
  add column if not exists attribution_source text,
  add column if not exists attribution_medium text,
  add column if not exists attribution_campaign text,
  add column if not exists attribution_content text,
  add column if not exists attribution_term text,
  add column if not exists landing_page text,
  add column if not exists referrer text,
  add column if not exists click_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leads'::regclass
      and conname = 'leads_urgency_check'
  ) then
    alter table public.leads add constraint leads_urgency_check
      check (urgency is null or urgency in ('emergency', 'today', 'this_week', 'planning'));
  end if;
end $$;

create table if not exists public.public_lead_rate_limits (
  fingerprint text primary key,
  window_started_at timestamptz not null default now(),
  window_count integer not null default 0,
  daily_started_at timestamptz not null default now(),
  daily_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.web_push_config (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  public_key text not null,
  private_key text not null,
  subject text not null default 'mailto:service@righttemphvac.com',
  created_at timestamptz not null default now()
);

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, endpoint)
);

create index if not exists web_push_subscriptions_org_idx
  on public.web_push_subscriptions (organization_id);
create index if not exists web_push_subscriptions_user_idx
  on public.web_push_subscriptions (user_id);

alter table public.public_lead_rate_limits enable row level security;
alter table public.web_push_config enable row level security;
alter table public.web_push_subscriptions enable row level security;

revoke all on public.public_lead_rate_limits from anon, authenticated;
revoke all on public.web_push_config from anon, authenticated;
revoke all on public.web_push_subscriptions from anon, authenticated;

create or replace function public.check_public_lead_rate_limit(p_fingerprint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.public_lead_rate_limits%rowtype;
  current_time timestamptz := now();
begin
  if p_fingerprint is null or length(p_fingerprint) <> 64 then
    return false;
  end if;

  insert into public.public_lead_rate_limits (fingerprint, window_count, daily_count)
  values (p_fingerprint, 1, 1)
  on conflict (fingerprint) do update set
    window_started_at = case
      when current_time - public.public_lead_rate_limits.window_started_at >= interval '15 minutes' then current_time
      else public.public_lead_rate_limits.window_started_at
    end,
    window_count = case
      when current_time - public.public_lead_rate_limits.window_started_at >= interval '15 minutes' then 1
      else public.public_lead_rate_limits.window_count + 1
    end,
    daily_started_at = case
      when current_time - public.public_lead_rate_limits.daily_started_at >= interval '24 hours' then current_time
      else public.public_lead_rate_limits.daily_started_at
    end,
    daily_count = case
      when current_time - public.public_lead_rate_limits.daily_started_at >= interval '24 hours' then 1
      else public.public_lead_rate_limits.daily_count + 1
    end,
    updated_at = current_time
  returning * into current_row;

  return current_row.window_count <= 5 and current_row.daily_count <= 20;
end;
$$;

revoke all on function public.check_public_lead_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_public_lead_rate_limit(text) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
