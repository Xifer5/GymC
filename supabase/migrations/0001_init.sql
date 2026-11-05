-- Gym Manager — esquema inicial (multi-tenant, importes en centavos)
create extension if not exists pgcrypto;

-- ───────── Tablas ─────────
create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  currency text not null default 'BOB',
  timezone text not null default 'America/La_Paz',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  gym_id uuid not null references gyms,
  full_name text not null,
  role text not null check (role in ('admin','receptionist')),
  permissions text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gym_counters (
  gym_id uuid primary key references gyms,
  receipt_seq int not null default 0
);

create table plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms,
  name text not null,
  duration_days int not null check (duration_days > 0),
  price_cents bigint not null check (price_cents >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms,
  full_name text not null,
  ci text not null,
  phone text not null,
  email text,
  photo_path text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive','suspended','archived')),
  joined_on date not null default current_date,
  created_by uuid references profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, ci)
);
create index on members (gym_id, full_name);
create index on members (gym_id, phone);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms,
  member_id uuid not null references members,
  plan_id uuid references plans,
  plan_name text not null,
  price_cents bigint not null check (price_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active','cancelled')),
  created_by uuid references profiles,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (discount_cents <= price_cents)
);
create index on memberships (gym_id, member_id, end_date desc);
create index on memberships (gym_id, end_date);

create table payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms,
  member_id uuid not null references members,
  membership_id uuid not null references memberships,
  receipt_no int not null,
  amount_cents bigint not null check (amount_cents > 0),
  method text not null check (method in ('cash','transfer','qr')),
  paid_at timestamptz not null default now(),
  note text,
  status text not null default 'confirmed' check (status in ('confirmed','voided')),
  void_reason text,
  voided_by uuid references profiles,
  voided_at timestamptz,
  created_by uuid references profiles,
  created_at timestamptz not null default now(),
  unique (gym_id, receipt_no),
  check (status = 'confirmed' or void_reason is not null)
);
create index on payments (gym_id, paid_at desc);
create index on payments (membership_id);

create table movement_categories (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms,
  type text not null check (type in ('income','expense')),
  name text not null,
  active boolean not null default true,
  unique (gym_id, type, name)
);

create table movements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms,
  type text not null check (type in ('income','expense')),
  category_id uuid not null references movement_categories,
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  method text not null check (method in ('cash','transfer','qr')),
  occurred_on date not null default current_date,
  attachment_path text,
  status text not null default 'confirmed' check (status in ('confirmed','voided')),
  void_reason text,
  voided_by uuid references profiles,
  voided_at timestamptz,
  created_by uuid references profiles,
  created_at timestamptz not null default now(),
  check (status = 'confirmed' or void_reason is not null)
);
create index on movements (gym_id, occurred_on desc);

create table audit_log (
  id bigint generated always as identity primary key,
  gym_id uuid not null references gyms,
  user_id uuid,
  action text not null,
  table_name text not null,
  record_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (gym_id, created_at desc);

-- ───────── Helpers ─────────
create function auth_gym_id() returns uuid
language sql stable security definer set search_path = public as $$
  select gym_id from profiles where id = auth.uid() and active
$$;

create function has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and active and (role = 'admin' or p = any(permissions))
  )
$$;

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_profiles_upd before update on profiles for each row execute function touch_updated_at();
create trigger t_plans_upd    before update on plans    for each row execute function touch_updated_at();
create trigger t_members_upd  before update on members  for each row execute function touch_updated_at();

-- Evita que un usuario se auto-eleve permisos o cambie de gimnasio
create function protect_profile() returns trigger language plpgsql security definer as $$
begin
  if auth.uid() is not null and not has_perm('staff.manage') then
    raise exception 'sin permiso';
  end if;
  if new.gym_id <> old.gym_id then raise exception 'gym_id inmutable'; end if;
  return new;
end $$;
create trigger t_profiles_protect before update on profiles for each row execute function protect_profile();

-- ───────── Vista de libro mayor (solo confirmados) ─────────
create view v_ledger with (security_invoker = true) as
  select gym_id, 'payment'::text as source, id, 'income'::text as type,
         amount_cents, method, (paid_at at time zone 'America/La_Paz')::date as occurred_on,
         'Pago recibo #' || receipt_no as description, null::uuid as category_id
  from payments where status = 'confirmed'
  union all
  select gym_id, 'movement', id, type, amount_cents, method, occurred_on, description, category_id
  from movements where status = 'confirmed';

-- ───────── RLS ─────────
alter table gyms enable row level security;
alter table profiles enable row level security;
alter table gym_counters enable row level security;
alter table plans enable row level security;
alter table members enable row level security;
alter table memberships enable row level security;
alter table payments enable row level security;
alter table movement_categories enable row level security;
alter table movements enable row level security;
alter table audit_log enable row level security;

create policy gyms_sel on gyms for select using (id = auth_gym_id());
create policy gyms_upd on gyms for update using (id = auth_gym_id() and has_perm('settings.manage'));

create policy profiles_sel on profiles for select using (gym_id = auth_gym_id());
create policy profiles_upd on profiles for update using (gym_id = auth_gym_id() and has_perm('staff.manage'));

create policy plans_sel on plans for select using (gym_id = auth_gym_id());
create policy plans_ins on plans for insert with check (gym_id = auth_gym_id() and has_perm('plans.manage'));
create policy plans_upd on plans for update using (gym_id = auth_gym_id() and has_perm('plans.manage'));

create policy members_sel on members for select using (gym_id = auth_gym_id() and has_perm('members.read'));
create policy members_ins on members for insert with check (gym_id = auth_gym_id() and has_perm('members.write'));
create policy members_upd on members for update using (gym_id = auth_gym_id() and has_perm('members.write'));

-- Lectura de tablas financieras; escritura SOLO por RPC
create policy memberships_sel on memberships for select using (gym_id = auth_gym_id() and has_perm('members.read'));
create policy payments_sel on payments for select
  using (gym_id = auth_gym_id() and (has_perm('payments.create') or has_perm('reports.view')));
create policy movements_sel on movements for select using (gym_id = auth_gym_id() and has_perm('movements.read'));

create policy cats_sel on movement_categories for select using (gym_id = auth_gym_id());
create policy cats_ins on movement_categories for insert with check (gym_id = auth_gym_id() and has_perm('settings.manage'));
create policy cats_upd on movement_categories for update using (gym_id = auth_gym_id() and has_perm('settings.manage'));

create policy audit_sel on audit_log for select using (gym_id = auth_gym_id() and has_perm('settings.manage'));

-- ───────── RPC (security definer, transaccionales) ─────────
create function _audit(p_action text, p_table text, p_id uuid, p_details jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (gym_id, user_id, action, table_name, record_id, details)
  values (auth_gym_id(), auth.uid(), p_action, p_table, p_id, p_details)
$$;

create function create_membership(
  p_member_id uuid, p_plan_id uuid, p_start date default null, p_discount_cents bigint default 0
) returns memberships
language plpgsql security definer set search_path = public as $$
declare
  g uuid := auth_gym_id(); pl plans; last_end date; s date; m memberships;
begin
  if not has_perm('memberships.write') then raise exception 'sin permiso'; end if;
  select * into pl from plans where id = p_plan_id and gym_id = g and active;
  if not found then raise exception 'plan inválido'; end if;
  perform 1 from members where id = p_member_id and gym_id = g;
  if not found then raise exception 'socio inválido'; end if;
  if p_discount_cents < 0 or p_discount_cents > pl.price_cents then raise exception 'descuento inválido'; end if;

  if p_start is null then
    select max(end_date) into last_end from memberships
      where member_id = p_member_id and status = 'active';
    s := greatest(current_date, coalesce(last_end + 1, current_date));
  else s := p_start; end if;

  insert into memberships (gym_id, member_id, plan_id, plan_name, price_cents, discount_cents,
                           start_date, end_date, created_by)
  values (g, p_member_id, pl.id, pl.name, pl.price_cents, p_discount_cents,
          s, s + pl.duration_days - 1, auth.uid())
  returning * into m;
  perform _audit('create', 'memberships', m.id);
  return m;
end $$;

create function register_payment(
  p_membership_id uuid, p_amount_cents bigint, p_method text, p_note text default null
) returns payments
language plpgsql security definer set search_path = public as $$
declare
  g uuid := auth_gym_id(); ms memberships; paid bigint; seq int; p payments;
begin
  if not has_perm('payments.create') then raise exception 'sin permiso'; end if;
  select * into ms from memberships where id = p_membership_id and gym_id = g for update;
  if not found then raise exception 'membresía inválida'; end if;
  if ms.status <> 'active' then raise exception 'membresía cancelada'; end if;
  select coalesce(sum(amount_cents), 0) into paid from payments
    where membership_id = ms.id and status = 'confirmed';
  if p_amount_cents <= 0 or paid + p_amount_cents > ms.price_cents - ms.discount_cents then
    raise exception 'monto excede el saldo pendiente';
  end if;
  insert into gym_counters (gym_id, receipt_seq) values (g, 1)
    on conflict (gym_id) do update set receipt_seq = gym_counters.receipt_seq + 1
    returning receipt_seq into seq;
  insert into payments (gym_id, member_id, membership_id, receipt_no, amount_cents, method, note, created_by)
  values (g, ms.member_id, ms.id, seq, p_amount_cents, p_method, p_note, auth.uid())
  returning * into p;
  perform _audit('create', 'payments', p.id, jsonb_build_object('amount_cents', p_amount_cents));
  return p;
end $$;

create function sell_membership(
  p_member_id uuid, p_plan_id uuid, p_start date, p_discount_cents bigint,
  p_paid_cents bigint, p_method text
) returns payments
language plpgsql security definer set search_path = public as $$
declare m memberships;
begin
  m := create_membership(p_member_id, p_plan_id, p_start, p_discount_cents);
  return register_payment(m.id, p_paid_cents, p_method, null);
end $$;

create function void_payment(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('payments.void') then raise exception 'sin permiso'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'motivo requerido'; end if;
  update payments set status = 'voided', void_reason = p_reason, voided_by = auth.uid(), voided_at = now()
    where id = p_id and gym_id = auth_gym_id() and status = 'confirmed';
  if not found then raise exception 'pago no encontrado o ya anulado'; end if;
  perform _audit('void', 'payments', p_id, jsonb_build_object('reason', p_reason));
end $$;

create function register_movement(
  p_type text, p_category_id uuid, p_description text, p_amount_cents bigint,
  p_method text, p_date date default current_date
) returns movements
language plpgsql security definer set search_path = public as $$
declare g uuid := auth_gym_id(); mv movements;
begin
  if not has_perm('movements.write') then raise exception 'sin permiso'; end if;
  perform 1 from movement_categories where id = p_category_id and gym_id = g and type = p_type and active;
  if not found then raise exception 'categoría inválida'; end if;
  insert into movements (gym_id, type, category_id, description, amount_cents, method, occurred_on, created_by)
  values (g, p_type, p_category_id, p_description, p_amount_cents, p_method, p_date, auth.uid())
  returning * into mv;
  perform _audit('create', 'movements', mv.id);
  return mv;
end $$;

create function void_movement(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('movements.write') then raise exception 'sin permiso'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'motivo requerido'; end if;
  update movements set status = 'voided', void_reason = p_reason, voided_by = auth.uid(), voided_at = now()
    where id = p_id and gym_id = auth_gym_id() and status = 'confirmed';
  if not found then raise exception 'movimiento no encontrado o ya anulado'; end if;
  perform _audit('void', 'movements', p_id, jsonb_build_object('reason', p_reason));
end $$;

revoke all on function create_membership, register_payment, sell_membership, void_payment,
  register_movement, void_movement from public, anon;
grant execute on function create_membership, register_payment, sell_membership, void_payment,
  register_movement, void_movement to authenticated;
