alter table public.model_versions
  add column if not exists traffic_share numeric(5,2) not null default 0,
  add column if not exists approval_threshold numeric(5,2) not null default 35;

update public.model_versions
set
  traffic_share = case status
    when 'champion' then 70
    when 'challenger' then 20
    else 10
  end,
  approval_threshold = case status
    when 'challenger' then 33
    when 'shadow' then 37
    else 35
  end
where traffic_share = 0
   or approval_threshold = 35;

alter table public.application_documents
  add column if not exists document_type text not null default 'other',
  add column if not exists verification_status text not null default 'review',
  add column if not exists extracted_data jsonb not null default '{}'::jsonb;

alter table public.application_documents
  drop constraint if exists application_documents_document_type_check,
  drop constraint if exists application_documents_verification_status_check;

alter table public.application_documents
  add constraint application_documents_document_type_check
    check (document_type in ('bank_statement', 'pay_stub', 'identity_document', 'other')),
  add constraint application_documents_verification_status_check
    check (verification_status in ('verified', 'review', 'rejected'));

create table if not exists public.application_data_sources (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  source_type text not null check (source_type in ('credit_bureau', 'payroll', 'bank_statements', 'public_records', 'device_intelligence', 'geospatial_index')),
  status text not null check (status in ('ingested', 'warning', 'missing')),
  confidence numeric(5,4) not null default 0,
  freshness_hours integer not null default 0,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists application_data_sources_application_id_idx
  on public.application_data_sources (application_id, created_at desc);

create table if not exists public.fraud_cases (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  category text not null check (category in ('claims_pattern', 'document_anomaly', 'identity_risk', 'synthetic_profile')),
  score numeric(5,2) not null,
  status text not null check (status in ('open', 'watch', 'cleared')),
  explanation text not null,
  created_at timestamptz not null default now()
);

create index if not exists fraud_cases_application_id_idx
  on public.fraud_cases (application_id, created_at desc);

create table if not exists public.model_evaluations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  model_version_id uuid not null references public.model_versions (id) on delete cascade,
  model_name text not null,
  version text not null,
  lane text not null check (lane in ('champion', 'challenger', 'shadow')),
  score numeric(5,2) not null,
  recommendation text not null check (recommendation in ('auto_approve', 'manual_review', 'decline')),
  delta_from_champion numeric(5,2) not null default 0,
  verdict text not null check (verdict in ('outperforming', 'trailing', 'parity')),
  created_at timestamptz not null default now()
);

create index if not exists model_evaluations_application_id_idx
  on public.model_evaluations (application_id, created_at desc);
create index if not exists model_evaluations_model_version_id_idx
  on public.model_evaluations (model_version_id, created_at desc);

alter table public.application_data_sources enable row level security;
alter table public.fraud_cases enable row level security;
alter table public.model_evaluations enable row level security;

drop policy if exists "application data sources tenant isolation" on public.application_data_sources;
drop policy if exists "fraud cases tenant isolation" on public.fraud_cases;
drop policy if exists "model evaluations tenant isolation" on public.model_evaluations;

create policy "application data sources tenant isolation" on public.application_data_sources
for all using (
  exists (
    select 1
    from public.applications a
    where a.id = application_data_sources.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  exists (
    select 1
    from public.applications a
    where a.id = application_data_sources.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);

create policy "fraud cases tenant isolation" on public.fraud_cases
for all using (
  exists (
    select 1
    from public.applications a
    where a.id = fraud_cases.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  exists (
    select 1
    from public.applications a
    where a.id = fraud_cases.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);

create policy "model evaluations tenant isolation" on public.model_evaluations
for all using (
  exists (
    select 1
    from public.applications a
    where a.id = model_evaluations.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  exists (
    select 1
    from public.applications a
    where a.id = model_evaluations.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);
