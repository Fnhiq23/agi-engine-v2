-- AGI Engine v2 — 授权表
-- 只存授权码的哈希，不存明文；只有 service_role（发码服务 / Worker）可读写。
-- 在 Supabase SQL Editor 里执行。

create table if not exists public.licenses (
  id           bigserial primary key,
  key_hash     text        not null,                 -- sha256(pepper + 规范化后的授权码)
  key_prefix   text        not null,                 -- 便于客服肉眼核对，如 AGI-7F2A
  product      text        not null default 'agi-engine-pro',
  plan         text        not null default 'pro',   -- pro / lifetime（lifetime 仍需写入 expires_at）
  status       text        not null default 'pending', -- pending / active / suspended / refunded
  email        text,
  order_id     text,
  seat_limit   int         not null default 1,
  expires_at   timestamptz not null,                 -- 必须有到期时间，前端不接受"永久有效"
  created_at   timestamptz not null default now(),
  activated_at timestamptz,
  constraint licenses_key_hash_uniq unique (key_hash)
);

create index if not exists licenses_email_idx on public.licenses (email);
create index if not exists licenses_status_idx on public.licenses (status);

-- 开 RLS 且不建任何 policy：anon / authenticated 一律无权访问，只有 service_role 能读。
alter table public.licenses enable row level security;

comment on table public.licenses is
  '授权码库存。发码 = 支付 webhook 里插入一行（status=active, expires_at=now()+interval）。校验 = Worker 用 key_hash 查询。';

-- 可选：审计日志，记录激活与校验失败，便于发现撞码
create table if not exists public.license_events (
  id         bigserial primary key,
  license_id bigint references public.licenses(id) on delete cascade,
  event      text not null,          -- activate / verify_ok / verify_fail
  ip_hash    text,
  created_at timestamptz not null default now()
);

alter table public.license_events enable row level security;
