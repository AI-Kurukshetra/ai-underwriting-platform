insert into storage.buckets (id, name, public)
values ('underwriting-documents', 'underwriting-documents', false)
on conflict (id) do nothing;

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  extracted_confidence numeric(5,4) not null default 0.8,
  analysis_summary text not null default '',
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists application_documents_application_id_idx
  on public.application_documents (application_id, created_at desc);

alter table public.application_documents enable row level security;

create policy "application documents tenant isolation" on public.application_documents
for all using (
  exists (
    select 1
    from public.applications a
    where a.id = application_documents.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  exists (
    select 1
    from public.applications a
    where a.id = application_documents.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);
