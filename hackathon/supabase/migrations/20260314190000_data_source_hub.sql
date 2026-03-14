alter table public.application_data_sources
  drop constraint if exists application_data_sources_source_type_check;

alter table public.application_data_sources
  add constraint application_data_sources_source_type_check
    check (source_type in (
      'credit_bureau',
      'payroll',
      'bank_statements',
      'public_records',
      'device_intelligence',
      'geospatial_index',
      'social_media',
      'iot_device'
    ));

create table if not exists public.data_source_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  source_type text not null check (source_type in ('credit_bureau', 'payroll', 'bank_statements', 'public_records', 'device_intelligence', 'geospatial_index', 'social_media', 'iot_device')),
  provider_name text not null,
  status text not null check (status in ('connected', 'attention', 'disconnected')),
  sync_mode text not null check (sync_mode in ('api', 'batch', 'manual')),
  default_freshness_hours integer not null default 24,
  coverage numeric(5,2) not null default 0,
  notes text not null default '',
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists data_source_connections_organization_id_idx
  on public.data_source_connections (organization_id, source_type, created_at desc);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  source_type text not null check (source_type in ('credit_bureau', 'payroll', 'bank_statements', 'public_records', 'device_intelligence', 'geospatial_index', 'social_media', 'iot_device')),
  provider_name text not null,
  status text not null check (status in ('succeeded', 'partial', 'failed')),
  records_processed integer not null default 0,
  triggered_by text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_runs_organization_id_idx
  on public.ingestion_runs (organization_id, created_at desc);
create index if not exists ingestion_runs_application_id_idx
  on public.ingestion_runs (application_id, created_at desc);

alter table public.data_source_connections enable row level security;
alter table public.ingestion_runs enable row level security;

drop policy if exists "data source connections tenant isolation" on public.data_source_connections;
drop policy if exists "ingestion runs tenant isolation" on public.ingestion_runs;

create policy "data source connections tenant isolation" on public.data_source_connections
for all using (organization_id = public.current_organization_id() or organization_id is null)
with check (organization_id = public.current_organization_id() or organization_id is null);

create policy "ingestion runs tenant isolation" on public.ingestion_runs
for all using (
  organization_id = public.current_organization_id()
  or exists (
    select 1
    from public.applications a
    where a.id = ingestion_runs.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  organization_id = public.current_organization_id()
  or exists (
    select 1
    from public.applications a
    where a.id = ingestion_runs.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);
