-- =====================================================================
-- Admin email allowlist (2026-10-14). Anyone whose sign-in email is on this
-- list becomes an admin automatically, including on their first Google
-- sign-in. Manage it from the SQL editor:
--   insert into public.admin_emails (email) values ('someone@example.com');
--   delete from public.admin_emails where email = 'someone@example.com';
--     (removing an email doesn't revoke an existing admin; also run
--      update public.users set is_admin = false where id = ...)
-- No app role can read or change this table.
-- =====================================================================

create table public.admin_emails (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, name, is_admin)
  values (new.id,
          left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60),
          exists (select 1 from public.admin_emails a where a.email = lower(coalesce(new.email, ''))));
  insert into public.user_private (user_id, phone, email)
  values (new.id, new.phone, nullif(new.email, ''));
  return new;
end;
$$;

insert into public.admin_emails (email) values
  ('reyakothari07@gmail.com'),
  ('aaryaman1112@gmail.com')
on conflict do nothing;

-- Accounts that already exist with these emails become admins now.
update public.users u set is_admin = true
  from auth.users a
 where a.id = u.id and lower(a.email) in (select email from public.admin_emails);
