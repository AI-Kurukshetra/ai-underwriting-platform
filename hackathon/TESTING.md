# Testing Guide

## Prerequisites
- Start the app:
```bash
npm run dev
```
- Confirm `.env` is configured.
- Confirm database migrations are applied.
- Sign in with a valid workspace account.

## Main Navigation
After sign-in, use the top navigation bar:
- `Dashboard` -> `/dashboard`
- `Loan Queue` -> `/applications`
- `Workflows` -> `/workflows`
- `Fraud` -> `/fraud-detection`
- `Data Sources` -> `/data-sources`
- `Models` -> `/models`
- `Portfolio` -> `/portfolio`
- `Monitoring` -> `/monitoring`
- `Account` -> `/account`

## Smoke Test
Open `/`, then use `Sign in` or `Create workspace`.
After login, click each nav item once and confirm the page opens without errors:
- `Dashboard`
- `Loan Queue`
- `Workflows`
- `Fraud`
- `Data Sources`
- `Models`
- `Portfolio`
- `Monitoring`
- `Account`

## Manual Feature Tests

### 1. Authentication
- On `/`, click `Create workspace`
- Fill the form and click `Create account`
- Or click `Sign in` and log in
- After login, click `Account`
- For reset flow, click `Forgot your password?` on the sign-in page
- To sign out, click `Sign out` in the top-right area
- Confirm protected pages redirect to login after sign-out

### 2. Application Intake and Scoring
- Click `Loan Queue`
- In the intake form, fill borrower details
- Upload 1-2 documents
- Click the submit button to create the application
- From the queue table, click the new application/customer row link
- Confirm the detail page shows:
  - risk score
  - recommendation
  - workflow stage
  - audit event for score generation

### 3. Document Processing
- On the application detail page, scroll to `OCR extraction and verification`
- Confirm uploaded files appear
- Check OCR confidence and extracted fields
- Use `Mark verified`, `Keep in review`, and `Reject`
- Confirm the document status updates

### 4. Workflow Automation
- Click `Workflows`
- Change thresholds and save
- Click `Save workflow`
- Create another application
- Confirm routing changes based on the updated workflow

### 5. Fraud Detection
- Click `Loan Queue`
- Create an application with signals like `device_mismatch`
- Click `Fraud`
- Confirm alerts and cases appear
- Use the `Open`, `Watch`, or `Clear` buttons on a case
- Confirm the update persists

### 6. Data Sources
- Click `Data Sources`
- Add a source connector
- Click `Add connector`
- Record an ingestion run
- Click `Record ingestion`
- If tied to an application, confirm it appears in application source coverage

### 7. Model Management
- Click `Models`
- Create a challenger model
- Use the `Create challenger` button
- Update traffic share
- Click `Update traffic`
- Update threshold, drift, and notes
- Click `Save governance settings`
- Promote a challenger
- Click `Promote champion`
- Confirm dashboard and monitoring reflect the changes

### 8. Portfolio and Geospatial
- Click `Portfolio`
- Confirm:
  - metrics render
  - concentration table renders
  - geospatial table renders
  - projection table renders

### 9. Monitoring
- Click `Monitoring`
- Confirm alerts appear for:
  - fraud activity
  - ingestion issues
  - model drift or experiments
  - document verification backlog

## API Checks
Read endpoints:
```bash
curl http://localhost:3000/api/applications
curl http://localhost:3000/api/workflows
curl http://localhost:3000/api/fraud-detection
curl http://localhost:3000/api/monitoring
```

Create a test application:
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "externalRef":"TEST-1001",
    "customerName":"Test User",
    "email":"test@example.com",
    "productLine":"personal_loan",
    "amountRequested":12000,
    "annualIncome":70000,
    "creditScore":690,
    "debtToIncome":0.32,
    "claimsCount":1,
    "fraudSignals":["device_mismatch"],
    "documentConfidence":0.82,
    "geospatialRisk":0.41,
    "state":"Florida"
  }'
```

## Recommended Test Order
1. Authentication
2. Application creation
3. Document verification
4. Workflow update
5. Fraud operations
6. Data source ingestion
7. Model governance
8. Portfolio review
9. Monitoring
