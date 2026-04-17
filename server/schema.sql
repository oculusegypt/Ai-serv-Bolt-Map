begin;
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text,
  name text,
  role text check (role in ('customer','provider','admin')) default 'customer',
  avatar text,
  services text[],
  documents text[],
  created_at timestamptz not null default now()
);
create table if not exists public.provider_locations (
  provider_id uuid primary key references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  is_available boolean not null default true,
  updated_at timestamptz not null default now()
);
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
  latitude double precision,
  longitude double precision,
  scheduled_date text,
  scheduled_time text,
  rating int,
  created_at timestamptz not null default now(),
  cancelled_by text,
  cancel_reason text,
  cancelled_at timestamptz,
  refund_status text not null default 'none',
  refund_amount int,
  refund_method text,
  refund_reference text
);
create index if not exists orders_customer_id_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_provider_id_idx on public.orders (provider_id, created_at desc);
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
create table if not exists public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
create table if not exists public.service_popularity (
  service_id text primary key,
  orders_count bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_presence_updated_at_idx on public.user_presence (updated_at desc);
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
create table if not exists public.service_chat_flows (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  region_id uuid references public.regions(id) on delete cascade,
  flow_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create unique index if not exists service_chat_flows_service_region_uidx on public.service_chat_flows (service_id, region_id);
create table if not exists public.services (
  id text primary key,
  name_ar text not null,
  description_ar text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.provider_services (
  provider_id uuid not null references public.profiles(id) on delete cascade,
  service_id text not null references public.services(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (provider_id, service_id)
);
create index if not exists provider_services_service_id_idx on public.provider_services (service_id);
create table if not exists public.app_settings (
  key text primary key,
  value_num numeric,
  value_text text,
  updated_at timestamptz not null default now()
);
create table if not exists public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
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
create unique index if not exists wallet_transactions_unique_order_type on public.wallet_transactions (order_id, type) where order_id is not null;
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
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create or replace function public.bump_service_popularity()
returns trigger
language plpgsql
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
create trigger on_orders_insert_bump_service_popularity after insert on public.orders for each row execute procedure public.bump_service_popularity();
drop trigger if exists service_chat_flows_set_updated_at on public.service_chat_flows;
create trigger service_chat_flows_set_updated_at before update on public.service_chat_flows for each row execute procedure public.set_updated_at();
drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services for each row execute procedure public.set_updated_at();
drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings for each row execute procedure public.set_updated_at();
drop trigger if exists wallet_accounts_set_updated_at on public.wallet_accounts;
create trigger wallet_accounts_set_updated_at before update on public.wallet_accounts for each row execute procedure public.set_updated_at();
commit;
