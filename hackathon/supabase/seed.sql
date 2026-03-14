insert into public.organizations (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Gradient Demo Org')
on conflict (id) do nothing;

insert into public.model_versions (
  id,
  organization_id,
  name,
  version,
  status,
  auc,
  precision,
  recall,
  drift,
  traffic_share,
  approval_threshold,
  notes,
  deployed_at
)
values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Gradient Lite', '1.3.0', 'champion', 0.870, 0.810, 0.780, 2.10, 70, 35, 'Primary underwriting model with explainability enabled.', '2026-03-08'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Gradient Lite', '1.4.0-rc1', 'challenger', 0.900, 0.830, 0.800, 1.20, 20, 33, 'Challenger model with additional fraud weighting.', '2026-03-12'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Fraud Sentinel', '0.9.2', 'shadow', 0.790, 0.740, 0.820, 3.40, 10, 37, 'Shadow model for device and synthetic identity experiments.', '2026-03-10')
on conflict (id) do nothing;

insert into public.workflows (
  id,
  organization_id,
  name,
  config
)
values
  (
    '88888888-8888-8888-8888-888888888881',
    '11111111-1111-1111-1111-111111111111',
    'Loan autopilot',
    '{"autoApproveBelow": 35, "declineAboveOrEqual": 65, "fraudEscalationAt": 70, "maxDebtToIncome": 0.45, "minDocumentConfidence": 0.74, "highAmountManualReviewAbove": 20000, "defaultReviewStage": "underwriter_review", "fraudReviewStage": "fraud_review"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.applications (
  id,
  organization_id,
  external_ref,
  customer_name,
  email,
  product_line,
  amount_requested,
  annual_income,
  credit_score,
  debt_to_income,
  claims_count,
  fraud_signals,
  document_confidence,
  geospatial_risk,
  state,
  status,
  workflow_stage,
  submitted_at
)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'UW-2026-1001', 'Mia Reynolds', 'mia.reynolds@example.com', 'personal_loan', 18000, 92000, 742, 0.24, 0, '{}', 0.94, 0.22, 'Texas', 'approved', 'decisioned', now() - interval '3 hours'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'UW-2026-1002', 'Jordan Patel', 'jordan.patel@example.com', 'personal_loan', 9200, 64000, 661, 0.39, 2, '{device_mismatch}', 0.81, 0.48, 'Florida', 'manual_review', 'underwriter_review', now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.risk_scores (
  application_id,
  score,
  band,
  fraud_probability,
  document_confidence,
  recommendation,
  reasons,
  factors,
  model_version
)
values
  ('22222222-2222-2222-2222-222222222221', 18, 'low', 7, 0.94, 'auto_approve', '{Application fits current underwriting appetite.}', '[]', 'gradient-lite-v1.3.0'),
  ('22222222-2222-2222-2222-222222222222', 47, 'moderate', 34, 0.81, 'manual_review', '{Fraud heuristics triggered: device_mismatch.}', '[]', 'gradient-lite-v1.3.0')
on conflict (application_id) do nothing;

insert into public.application_documents (
  id,
  application_id,
  file_name,
  mime_type,
  size_bytes,
  document_type,
  verification_status,
  extracted_confidence,
  analysis_summary,
  extracted_data,
  storage_path
)
values
  (
    '44444444-4444-4444-4444-444444444441',
    '22222222-2222-2222-2222-222222222221',
    'bank_statement_mia_reynolds.pdf',
    'application/pdf',
    224000,
    'bank_statement',
    'verified',
    0.94,
    'application/pdf · strong OCR readiness',
    '{"statement_months": 3, "detected_employer": "Bacancy", "average_balance_band": "healthy"}'::jsonb,
    null
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '22222222-2222-2222-2222-222222222222',
    'income_letter_scan.jpg',
    'image/jpeg',
    49000,
    'pay_stub',
    'review',
    0.67,
    'image/jpeg · weak OCR readiness',
    '{"gross_income_band": "requires review", "pay_frequency": "monthly", "employer_match": "partial"}'::jsonb,
    null
  )
on conflict (id) do nothing;

insert into public.application_data_sources (
  id,
  application_id,
  source_type,
  status,
  confidence,
  freshness_hours,
  detail,
  created_at
)
values
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 'credit_bureau', 'ingested', 0.94, 12, 'Credit bureau pull normalized to score 742.', now() - interval '3 hours'),
  ('55555555-5555-5555-5555-555555555552', '22222222-2222-2222-2222-222222222221', 'bank_statements', 'ingested', 0.91, 6, 'Bank statement ingestion completed with OCR coverage.', now() - interval '3 hours'),
  ('55555555-5555-5555-5555-555555555553', '22222222-2222-2222-2222-222222222221', 'payroll', 'warning', 0.58, 48, 'Borrower income present, but payroll evidence needs review.', now() - interval '3 hours'),
  ('55555555-5555-5555-5555-555555555554', '22222222-2222-2222-2222-222222222221', 'geospatial_index', 'ingested', 0.88, 12, 'South concentration index 35 with derived risk 27%.', now() - interval '3 hours'),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'credit_bureau', 'ingested', 0.94, 12, 'Credit bureau pull normalized to score 661.', now() - interval '2 hours'),
  ('55555555-5555-5555-5555-555555555556', '22222222-2222-2222-2222-222222222222', 'payroll', 'ingested', 0.89, 4, 'Income verification package matched borrower stated income.', now() - interval '2 hours'),
  ('55555555-5555-5555-5555-555555555557', '22222222-2222-2222-2222-222222222222', 'device_intelligence', 'warning', 0.55, 1, 'Device mismatch or session anomaly flagged during intake.', now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.fraud_cases (
  id,
  application_id,
  category,
  score,
  status,
  explanation,
  created_at
)
values
  ('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222222', 'claims_pattern', 68, 'watch', 'Historical loss events are above the portfolio baseline and require fraud-pattern validation.', now() - interval '2 hours'),
  ('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222222', 'document_anomaly', 56, 'watch', 'Borrower document packet contains low-confidence or mismatched OCR extraction.', now() - interval '2 hours'),
  ('66666666-6666-6666-6666-666666666663', '22222222-2222-2222-2222-222222222222', 'identity_risk', 57, 'open', 'Identity telemetry flagged signals: device_mismatch.', now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.model_evaluations (
  id,
  application_id,
  model_version_id,
  model_name,
  version,
  lane,
  score,
  recommendation,
  delta_from_champion,
  verdict,
  created_at
)
values
  ('77777777-7777-7777-7777-777777777771', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333331', 'Gradient Lite', '1.3.0', 'champion', 18, 'auto_approve', 0, 'parity', now() - interval '3 hours'),
  ('77777777-7777-7777-7777-777777777772', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333332', 'Gradient Lite', '1.4.0-rc1', 'challenger', 16, 'auto_approve', -2, 'parity', now() - interval '3 hours'),
  ('77777777-7777-7777-7777-777777777773', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333333', 'Fraud Sentinel', '0.9.2', 'shadow', 20, 'auto_approve', 2, 'parity', now() - interval '3 hours'),
  ('77777777-7777-7777-7777-777777777774', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331', 'Gradient Lite', '1.3.0', 'champion', 47, 'manual_review', 0, 'parity', now() - interval '2 hours'),
  ('77777777-7777-7777-7777-777777777775', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333332', 'Gradient Lite', '1.4.0-rc1', 'challenger', 45, 'manual_review', -2, 'parity', now() - interval '2 hours'),
  ('77777777-7777-7777-7777-777777777776', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Fraud Sentinel', '0.9.2', 'shadow', 49, 'manual_review', 2, 'parity', now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.fraud_alerts (application_id, customer_name, severity, reason)
values
  ('22222222-2222-2222-2222-222222222222', 'Jordan Patel', 'medium', 'Device mismatch detected between intake and upload session.')
on conflict do nothing;

insert into public.portfolio_metrics (organization_id, label, value, delta, tone)
values
  ('11111111-1111-1111-1111-111111111111', 'Book premium equivalent', '$12.4M', '+4.2% this month', 'positive'),
  ('11111111-1111-1111-1111-111111111111', 'Average expected loss ratio', '42%', 'Stable vs prior week', 'neutral'),
  ('11111111-1111-1111-1111-111111111111', 'High-risk concentration', '18%', 'Above target by 2 pts', 'negative');
