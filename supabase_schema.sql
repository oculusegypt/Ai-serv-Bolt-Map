-- Supabase schema for Khidmati AI Service Chatbot
-- Run this in Supabase Dashboard -> SQL Editor
-- Note: This script assumes you use Supabase Auth (auth.users)

begin;

-- =========================
-- 1) PROFILES
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  name text,
  role text check (role in ('customer','provider','admin')) default 'customer',
  avatar text,
  services text[],
  documents text[],
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
with check (auth.uid() = id);

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'admin'
  );
$$;

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
on public.profiles for select
using (public.is_admin(auth.uid()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- (Optional) allow authenticated users to read provider profiles for map listing.
-- If you want providers visible on the map, enable this policy.
-- WARNING: this exposes provider names/avatars/services to all logged-in users.
drop policy if exists profiles_select_providers_for_authenticated on public.profiles;
create policy profiles_select_providers_for_authenticated
on public.profiles for select
using (
  auth.role() = 'authenticated'
  and role = 'provider'
);

-- Allow providers to read customer profiles for orders assigned to them (for order detail / contact)
drop policy if exists profiles_select_customers_for_assigned_provider_orders on public.profiles;
create policy profiles_select_customers_for_assigned_provider_orders
on public.profiles for select
using (
  auth.role() = 'authenticated'
  and role = 'customer'
  and exists (
    select 1
    from public.orders o
    where o.provider_id = auth.uid()
      and o.customer_id = public.profiles.id
  )
);


-- =========================
-- 1.1) PROFILES AUTO-CREATION TRIGGER
-- =========================
-- Creates/updates the public.profiles row when a new auth user is created.
-- This is required when email confirmation is enabled because the user may not have
-- an authenticated session at sign-up time, and RLS would block client-side inserts.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, name, role, services, avatar, documents)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'customer'),
    case
      when jsonb_typeof(new.raw_user_meta_data->'services') = 'array'
        then (select array_agg(value::text) from jsonb_array_elements_text(new.raw_user_meta_data->'services'))
      else null
    end,
    null,
    null
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
    name = excluded.name,
    role = excluded.role,
    services = excluded.services;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();


-- =========================
-- 2) PROVIDER LOCATIONS
-- =========================
create table if not exists public.provider_locations (
  provider_id uuid primary key references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  is_available boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.provider_locations add column if not exists is_available boolean not null default true;

-- =========================
-- Realtime (logical replication)
-- =========================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'provider_locations'
  ) then
    execute 'alter publication supabase_realtime add table public.provider_locations';
  end if;
end $$;

alter table public.provider_locations enable row level security;

drop policy if exists provider_locations_upsert_own on public.provider_locations;
create policy provider_locations_upsert_own
on public.provider_locations
for insert
with check (auth.uid() = provider_id);

drop policy if exists provider_locations_update_own on public.provider_locations;
create policy provider_locations_update_own
on public.provider_locations
for update
using (auth.uid() = provider_id)
with check (auth.uid() = provider_id);

drop policy if exists provider_locations_select_authenticated on public.provider_locations;
create policy provider_locations_select_authenticated
on public.provider_locations
for select
using (auth.role() = 'authenticated');


-- =========================
-- 2.1) ORDERS
-- =========================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  service_id text not null,
  service_name text not null,
  status text not null default 'pending',
  total_price int not null,
  address text not null,
  scheduled_date text,
  scheduled_time text,
  rating int,
  created_at timestamptz not null default now()
);

-- Cancellation / Refund (status-only payments)
alter table public.orders add column if not exists cancelled_by text;
alter table public.orders add column if not exists cancel_reason text;
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists refund_status text not null default 'none';
alter table public.orders add column if not exists refund_amount int;
alter table public.orders add column if not exists refund_method text;
alter table public.orders add column if not exists refund_reference text;

create index if not exists orders_customer_id_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_provider_id_idx on public.orders (provider_id, created_at desc);

alter table public.orders enable row level security;

drop policy if exists orders_select_customer_or_provider_or_admin on public.orders;
create policy orders_select_customer_or_provider_or_admin
on public.orders for select
using (
  auth.role() = 'authenticated'
  and (
    customer_id = auth.uid()
    or provider_id = auth.uid()
    or public.is_admin(auth.uid())
  )
);

drop policy if exists orders_insert_customer_own on public.orders;
create policy orders_insert_customer_own
on public.orders for insert
with check (
  auth.role() = 'authenticated'
  and customer_id = auth.uid()
);

drop policy if exists orders_update_provider_status on public.orders;
create policy orders_update_provider_status
on public.orders for update
using (
  auth.role() = 'authenticated'
  and provider_id = auth.uid()
)
with check (
  auth.role() = 'authenticated'
  and provider_id = auth.uid()
);

drop policy if exists orders_update_customer_rating on public.orders;
create policy orders_update_customer_rating
on public.orders for update
using (
  auth.role() = 'authenticated'
  and customer_id = auth.uid()
)
with check (
  auth.role() = 'authenticated'
  and customer_id = auth.uid()
);

-- =========================
-- 2.2) ORDER MESSAGES (ORDER CHAT)
-- =========================
create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists order_messages_order_id_created_at_idx on public.order_messages (order_id, created_at asc);
create index if not exists order_messages_receiver_id_idx on public.order_messages (receiver_id);

alter table public.order_messages enable row level security;

drop policy if exists order_messages_select_participants on public.order_messages;
create policy order_messages_select_participants
on public.order_messages
for select
using (
  auth.role() = 'authenticated'
  and (sender_id = auth.uid() or receiver_id = auth.uid())
);

drop policy if exists order_messages_insert_participants on public.order_messages;
create policy order_messages_insert_participants
on public.order_messages
for insert
with check (
  auth.role() = 'authenticated'
  and sender_id = auth.uid()
  and exists (
    select 1
    from public.orders o
    where o.id = order_id
      and ((o.customer_id = sender_id and o.provider_id = receiver_id) or (o.provider_id = sender_id and o.customer_id = receiver_id))
  )
);

drop policy if exists order_messages_update_receiver_read on public.order_messages;
create policy order_messages_update_receiver_read
on public.order_messages
for update
using (
  auth.role() = 'authenticated'
  and receiver_id = auth.uid()
)
with check (
  auth.role() = 'authenticated'
  and receiver_id = auth.uid()
);

-- Realtime replication for order_messages
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.order_messages';
  end if;
end $$;


-- =========================
-- 2.3) NOTIFICATIONS (CROSS-DEVICE)
-- =========================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_id_read_at_idx on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications for select
using (auth.role() = 'authenticated' and user_id = auth.uid());

drop policy if exists notifications_insert_own on public.notifications;
create policy notifications_insert_own
on public.notifications for insert
with check (auth.role() = 'authenticated' and user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications for update
using (auth.role() = 'authenticated' and user_id = auth.uid())
with check (auth.role() = 'authenticated' and user_id = auth.uid());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
on public.notifications for delete
using (auth.role() = 'authenticated' and user_id = auth.uid());

-- Realtime replication for notifications
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;


-- =========================
-- 2.4) SERVICE POPULARITY (ORDER COUNTS)
-- =========================
create table if not exists public.service_popularity (
  service_id text primary key,
  orders_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.service_popularity enable row level security;

drop policy if exists service_popularity_select_authenticated on public.service_popularity;
create policy service_popularity_select_authenticated
on public.service_popularity for select
using (auth.role() = 'authenticated');

create or replace function public.bump_service_popularity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.service_popularity (service_id, orders_count, updated_at)
  values (new.service_id, 1, now())
  on conflict (service_id) do update set
    orders_count = public.service_popularity.orders_count + 1,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_orders_insert_bump_service_popularity on public.orders;
create trigger on_orders_insert_bump_service_popularity
after insert on public.orders
for each row execute procedure public.bump_service_popularity();

-- =========================
-- 2.3) USER PRESENCE (ONLINE / LAST SEEN)
-- =========================
create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_presence_updated_at_idx on public.user_presence (updated_at desc);

alter table public.user_presence enable row level security;

drop policy if exists user_presence_select_authenticated on public.user_presence;
create policy user_presence_select_authenticated
on public.user_presence
for select
using (auth.role() = 'authenticated');

drop policy if exists user_presence_upsert_self on public.user_presence;
create policy user_presence_upsert_self
on public.user_presence
for insert
with check (auth.role() = 'authenticated' and user_id = auth.uid());

drop policy if exists user_presence_update_self on public.user_presence;
create policy user_presence_update_self
on public.user_presence
for update
using (auth.role() = 'authenticated' and user_id = auth.uid())
with check (auth.role() = 'authenticated' and user_id = auth.uid());

-- Realtime replication for user_presence
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_presence'
  ) then
    execute 'alter publication supabase_realtime add table public.user_presence';
  end if;
end $$;


-- =========================
-- 3) SERVICE CHAT FLOWS (ADMIN-EDITABLE)
-- =========================
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  extra_fee int not null default 0,
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- If the table existed from an older version, ensure bbox columns exist.
alter table public.regions add column if not exists min_lat double precision;
alter table public.regions add column if not exists max_lat double precision;
alter table public.regions add column if not exists min_lng double precision;
alter table public.regions add column if not exists max_lng double precision;

alter table public.regions enable row level security;

-- Authenticated users can read regions (needed for pricing rules / selection)
drop policy if exists regions_select_authenticated on public.regions;
create policy regions_select_authenticated
on public.regions for select
using (auth.role() = 'authenticated');

-- Admins can manage regions
drop policy if exists regions_admin_write on public.regions;
create policy regions_admin_write
on public.regions
for all
using (
  public.is_admin(auth.uid())
)
with check (
  public.is_admin(auth.uid())
);

create table if not exists public.service_chat_flows (
  service_id text primary key,
  flow_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Upgrade to region-aware overrides
alter table public.service_chat_flows
  add column if not exists region_id uuid references public.regions(id) on delete cascade;

-- Allow multiple rows per service based on region (NULL = global)
alter table public.service_chat_flows drop constraint if exists service_chat_flows_pkey;
alter table public.service_chat_flows add column if not exists id uuid primary key default gen_random_uuid();

drop index if exists service_chat_flows_service_region_uidx;
create unique index service_chat_flows_service_region_uidx
on public.service_chat_flows (service_id, region_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_chat_flows_set_updated_at on public.service_chat_flows;
create trigger service_chat_flows_set_updated_at
before update on public.service_chat_flows
for each row execute procedure public.set_updated_at();

alter table public.service_chat_flows enable row level security;

-- Authenticated users can read flows (the app needs this)
drop policy if exists service_chat_flows_select_authenticated on public.service_chat_flows;
create policy service_chat_flows_select_authenticated
on public.service_chat_flows for select
using (auth.role() = 'authenticated');

-- Admins can insert/update/delete flows
drop policy if exists service_chat_flows_admin_write on public.service_chat_flows;
create policy service_chat_flows_admin_write
on public.service_chat_flows
for all
using (
  public.is_admin(auth.uid())
)
with check (
  public.is_admin(auth.uid())
 );

 create table if not exists public.services (
   id text primary key,
   name_ar text not null,
   description_ar text,
   is_active boolean not null default true,
   sort_order int not null default 0,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );

 drop trigger if exists services_set_updated_at on public.services;
 create trigger services_set_updated_at
 before update on public.services
 for each row execute procedure public.set_updated_at();

 alter table public.services enable row level security;

 drop policy if exists services_select_authenticated on public.services;
 create policy services_select_authenticated
 on public.services for select
 using (auth.role() = 'authenticated');

 drop policy if exists services_admin_write on public.services;
 create policy services_admin_write
 on public.services
 for all
 using (
   public.is_admin(auth.uid())
 )
 with check (
   public.is_admin(auth.uid())
 );

 create table if not exists public.provider_services (
   provider_id uuid not null references public.profiles(id) on delete cascade,
   service_id text not null references public.services(id) on delete cascade,
   is_active boolean not null default true,
   created_at timestamptz not null default now(),
   primary key (provider_id, service_id)
 );

 create index if not exists provider_services_service_id_idx on public.provider_services (service_id);

 alter table public.provider_services enable row level security;

 drop policy if exists provider_services_select_own_or_admin on public.provider_services;
 create policy provider_services_select_own_or_admin
 on public.provider_services for select
 using (
   auth.role() = 'authenticated'
   and (
     provider_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 );

 drop policy if exists provider_services_insert_own_or_admin on public.provider_services;
 create policy provider_services_insert_own_or_admin
 on public.provider_services for insert
 with check (
   auth.role() = 'authenticated'
   and (
     provider_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 );

 drop policy if exists provider_services_update_own_or_admin on public.provider_services;
 create policy provider_services_update_own_or_admin
 on public.provider_services for update
 using (
   auth.role() = 'authenticated'
   and (
     provider_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 )
 with check (
   auth.role() = 'authenticated'
   and (
     provider_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 );

 drop policy if exists provider_services_delete_own_or_admin on public.provider_services;
 create policy provider_services_delete_own_or_admin
 on public.provider_services for delete
 using (
   auth.role() = 'authenticated'
   and (
     provider_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 );

 create table if not exists public.app_settings (
   key text primary key,
   value_num numeric,
   value_text text,
   updated_at timestamptz not null default now()
 );

 drop trigger if exists app_settings_set_updated_at on public.app_settings;
 create trigger app_settings_set_updated_at
 before update on public.app_settings
 for each row execute procedure public.set_updated_at();

 alter table public.app_settings enable row level security;

 drop policy if exists app_settings_select_authenticated on public.app_settings;
 create policy app_settings_select_authenticated
 on public.app_settings for select
 using (auth.role() = 'authenticated');

 drop policy if exists app_settings_admin_write on public.app_settings;
 create policy app_settings_admin_write
 on public.app_settings
 for all
 using (
   public.is_admin(auth.uid())
 )
 with check (
   public.is_admin(auth.uid())
 );

 create table if not exists public.wallet_accounts (
   user_id uuid primary key references public.profiles(id) on delete cascade,
   balance numeric not null default 0,
   updated_at timestamptz not null default now()
 );

 drop trigger if exists wallet_accounts_set_updated_at on public.wallet_accounts;
 create trigger wallet_accounts_set_updated_at
 before update on public.wallet_accounts
 for each row execute procedure public.set_updated_at();

 alter table public.wallet_accounts enable row level security;

 drop policy if exists wallet_accounts_select_own_or_admin on public.wallet_accounts;
 create policy wallet_accounts_select_own_or_admin
 on public.wallet_accounts for select
 using (
   auth.role() = 'authenticated'
   and (
     user_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 );

 drop policy if exists wallet_accounts_admin_write on public.wallet_accounts;
 create policy wallet_accounts_admin_write
 on public.wallet_accounts
 for all
 using (
   public.is_admin(auth.uid())
 )
 with check (
   public.is_admin(auth.uid())
 );

 create table if not exists public.wallet_transactions (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null references public.profiles(id) on delete cascade,
   order_id uuid references public.orders(id) on delete set null,
   amount numeric not null,
   type text not null,
   note text,
   created_by uuid references public.profiles(id) on delete set null,
   created_at timestamptz not null default now()
 );

 create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions (user_id, created_at desc);
 create index if not exists wallet_transactions_order_id_idx on public.wallet_transactions (order_id);
 create unique index if not exists wallet_transactions_unique_order_type
 on public.wallet_transactions (order_id, type)
 where order_id is not null;

 alter table public.wallet_transactions enable row level security;

 drop policy if exists wallet_transactions_select_own_or_admin on public.wallet_transactions;
 create policy wallet_transactions_select_own_or_admin
 on public.wallet_transactions for select
 using (
   auth.role() = 'authenticated'
   and (
     user_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 );

 drop policy if exists wallet_transactions_admin_insert on public.wallet_transactions;
 create policy wallet_transactions_admin_insert
 on public.wallet_transactions for insert
 with check (
   public.is_admin(auth.uid())
 );

 drop policy if exists wallet_transactions_admin_update on public.wallet_transactions;
 create policy wallet_transactions_admin_update
 on public.wallet_transactions for update
 using (
   public.is_admin(auth.uid())
 )
 with check (
   public.is_admin(auth.uid())
 );

 drop policy if exists wallet_transactions_admin_delete on public.wallet_transactions;
 create policy wallet_transactions_admin_delete
 on public.wallet_transactions for delete
 using (
   public.is_admin(auth.uid())
 );

 create table if not exists public.withdraw_requests (
   id uuid primary key default gen_random_uuid(),
   provider_id uuid not null references public.profiles(id) on delete cascade,
   amount numeric not null,
   status text not null default 'pending',
   provider_note text,
   admin_note text,
   created_at timestamptz not null default now(),
   reviewed_at timestamptz,
   paid_at timestamptz
 );

 create index if not exists withdraw_requests_provider_id_idx on public.withdraw_requests (provider_id, created_at desc);

 alter table public.withdraw_requests enable row level security;

 drop policy if exists withdraw_requests_select_own_or_admin on public.withdraw_requests;
 create policy withdraw_requests_select_own_or_admin
 on public.withdraw_requests for select
 using (
   auth.role() = 'authenticated'
   and (
     provider_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 );

 drop policy if exists withdraw_requests_insert_provider on public.withdraw_requests;
 create policy withdraw_requests_insert_provider
 on public.withdraw_requests for insert
 with check (
   auth.role() = 'authenticated'
   and provider_id = auth.uid()
 );

 drop policy if exists withdraw_requests_update_provider_cancel_pending on public.withdraw_requests;
 create policy withdraw_requests_update_provider_cancel_pending
 on public.withdraw_requests for update
 using (
   auth.role() = 'authenticated'
   and provider_id = auth.uid()
   and status = 'pending'
 )
 with check (
   auth.role() = 'authenticated'
   and provider_id = auth.uid()
   and status in ('pending', 'cancelled')
 );

 drop policy if exists withdraw_requests_admin_write on public.withdraw_requests;
 create policy withdraw_requests_admin_write
 on public.withdraw_requests
 for all
 using (
   public.is_admin(auth.uid())
 )
 with check (
   public.is_admin(auth.uid())
 );

 create table if not exists public.refund_requests (
   id uuid primary key default gen_random_uuid(),
   order_id uuid not null references public.orders(id) on delete cascade,
   customer_id uuid not null references public.profiles(id) on delete cascade,
   provider_id uuid not null references public.profiles(id) on delete cascade,
   requested_amount numeric not null,
   approved_amount numeric,
   status text not null default 'pending',
   reason text,
   admin_note text,
   created_at timestamptz not null default now(),
   reviewed_at timestamptz,
   processed_at timestamptz
 );

 create unique index if not exists refund_requests_unique_order_idx on public.refund_requests (order_id);
 create index if not exists refund_requests_customer_id_idx on public.refund_requests (customer_id, created_at desc);
 create index if not exists refund_requests_provider_id_idx on public.refund_requests (provider_id, created_at desc);

 alter table public.refund_requests enable row level security;

 drop policy if exists refund_requests_select_customer_provider_or_admin on public.refund_requests;
 create policy refund_requests_select_customer_provider_or_admin
 on public.refund_requests for select
 using (
   auth.role() = 'authenticated'
   and (
     customer_id = auth.uid()
     or provider_id = auth.uid()
     or public.is_admin(auth.uid())
   )
 );

 drop policy if exists refund_requests_insert_customer on public.refund_requests;
 create policy refund_requests_insert_customer
 on public.refund_requests for insert
 with check (
   auth.role() = 'authenticated'
   and customer_id = auth.uid()
 );

 drop policy if exists refund_requests_admin_write on public.refund_requests;
 create policy refund_requests_admin_write
 on public.refund_requests
 for all
 using (
   public.is_admin(auth.uid())
 )
 with check (
   public.is_admin(auth.uid())
 );

 commit;
