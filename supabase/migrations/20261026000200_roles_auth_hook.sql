create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to supabase_auth_admin;

create policy "auth service reads roles" on public.user_roles
  for select to supabase_auth_admin
  using (true);

create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := event -> 'claims';
  app_metadata jsonb := coalesce(event -> 'claims' -> 'app_metadata', '{}'::jsonb) - 'role';
  user_role public.app_role;
begin
  select ur.role into user_role
  from public.user_roles ur
  where ur.user_id = (event ->> 'user_id')::uuid;

  if user_role is not null then
    app_metadata := app_metadata || jsonb_build_object('role', user_role);
  end if;

  return jsonb_set(event, '{claims}', jsonb_set(claims, '{app_metadata}', app_metadata));
end;
$$;

revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

create function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false);
$$;

grant execute on function private.is_admin() to anon, authenticated;

create function private.require_admin()
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_admin() then
    perform private.raise_error('FORBIDDEN');
  end if;
end;
$$;
