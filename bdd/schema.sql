-- ============================================================
-- VRG Gaming — Schéma base de données Supabase
-- Coller dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Profils clients (extension de auth.users)
create table if not exists profiles (
  id       uuid references auth.users on delete cascade primary key,
  name     text not null,
  phone    text not null,
  created_at timestamptz default now()
);

-- 2. Commandes
create table if not exists orders (
  id             bigserial primary key,
  user_id        uuid references auth.users on delete cascade not null,
  payment        text not null,
  address        text not null,
  note           text default '',
  total          integer not null,
  transfer_phone text,
  transfer_name  text,
  transfer_id    text,
  status         text default 'En attente',
  created_at     timestamptz default now()
);

-- 3. Articles des commandes
create table if not exists order_items (
  id       bigserial primary key,
  order_id bigint references orders on delete cascade not null,
  name     text not null,
  qty      integer not null,
  price    integer not null
);

-- ─── Row Level Security ────────────────────────────────────

alter table profiles   enable row level security;
alter table orders     enable row level security;
alter table order_items enable row level security;

-- Profils : chaque utilisateur voit/modifie uniquement le sien
create policy "profiles_own" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Commandes : chaque utilisateur voit/crée ses commandes
create policy "orders_own" on orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Articles : accessibles uniquement via les commandes de l'utilisateur
create policy "order_items_own" on order_items
  for all using (
    order_id in (select id from orders where user_id = auth.uid())
  ) with check (
    order_id in (select id from orders where user_id = auth.uid())
  );

-- ─── Trigger : créer le profil automatiquement à l'inscription ─

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
