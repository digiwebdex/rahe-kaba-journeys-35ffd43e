# Database Schema Reference — RAHE KABA Tours & Travels

> Complete database table reference and relationships

---

## Overview

- **Engine:** PostgreSQL
- **Extensions:** `uuid-ossp`, `pgcrypto`
- **Schema File:** `server/schema.sql`

---

## Tables

### `users`

Core authentication table.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Default: `uuid_generate_v4()` |
| email | VARCHAR(255) | Unique, NOT NULL |
| password_hash | TEXT | bcrypt hashed |
| is_banned | BOOLEAN | Default: false |
| created_at | TIMESTAMPTZ | Default: NOW() |
| updated_at | TIMESTAMPTZ | |

### `user_roles`

Role assignments.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK → users) | |
| role | app_role ENUM | admin, user, manager, staff, viewer, accountant, booking, cms |

**Unique:** (user_id, role)

### `profiles`

Extended user information.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID | NOT NULL |
| full_name | VARCHAR | |
| email | VARCHAR | |
| phone | VARCHAR | |
| passport_number | VARCHAR | |
| nid_number | VARCHAR | |
| date_of_birth | DATE | |
| address | TEXT | |
| emergency_contact | VARCHAR | |
| notes | TEXT | |
| status | VARCHAR | Default: 'active' |

### `packages`

Hajj/Umrah/Tour packages.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | VARCHAR | NOT NULL |
| type | VARCHAR | hajj, umrah, tour |
| price | DECIMAL | NOT NULL |
| description | TEXT | |
| duration_days | INTEGER | |
| start_date | DATE | |
| expiry_date | DATE | |
| features | JSONB | Array of feature strings |
| services | JSONB | |
| image_url | TEXT | |
| is_active | BOOLEAN | Default: true |
| show_on_website | BOOLEAN | Default: true |
| status | VARCHAR | Default: 'active' |

### `bookings`

Customer bookings.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| tracking_id | VARCHAR | Unique, auto-generated |
| user_id | UUID | |
| package_id | UUID (FK → packages) | |
| moallem_id | UUID (FK → moallems) | |
| supplier_agent_id | UUID (FK → supplier_agents) | |
| booking_type | VARCHAR | Default: 'direct' |
| num_travelers | INTEGER | |
| total_amount | DECIMAL | |
| paid_amount | DECIMAL | Default: 0 |
| due_amount | DECIMAL | Computed |
| discount | DECIMAL | Default: 0 |
| status | VARCHAR | pending, confirmed, completed, cancelled |
| cost_price_per_person | DECIMAL | |
| selling_price_per_person | DECIMAL | |
| total_cost | DECIMAL | |
| profit_amount | DECIMAL | |
| extra_expense | DECIMAL | |
| commission_per_person | DECIMAL | |
| total_commission | DECIMAL | |
| commission_paid | DECIMAL | |
| commission_due | DECIMAL | |
| paid_by_moallem | DECIMAL | |
| moallem_due | DECIMAL | |
| paid_to_supplier | DECIMAL | |
| supplier_due | DECIMAL | |
| guest_name | VARCHAR | For guest bookings |
| guest_email | VARCHAR | |
| guest_phone | VARCHAR | |
| guest_passport | VARCHAR | |
| guest_address | TEXT | |
| notes | TEXT | |
| installment_plan_id | UUID (FK) | |

### `payments`

Payment records.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| booking_id | UUID (FK → bookings) | |
| user_id | UUID | |
| customer_id | UUID | |
| amount | DECIMAL | |
| status | VARCHAR | pending, completed |
| payment_method | VARCHAR | cash, bank, bkash, nagad |
| installment_number | INTEGER | |
| due_date | DATE | |
| paid_at | TIMESTAMPTZ | |
| notes | TEXT | |
| receipt_file_path | TEXT | |
| transaction_id | VARCHAR | |
| wallet_account_id | UUID (FK → accounts) | |

### `moallems`

Agent/referrer management.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | VARCHAR | NOT NULL |
| phone | VARCHAR | |
| address | TEXT | |
| nid_number | VARCHAR | |
| contracted_hajji | INTEGER | Default: 0 |
| contracted_amount | DECIMAL | Default: 0 |
| total_deposit | DECIMAL | Default: 0 |
| total_due | DECIMAL | Default: 0 |
| contract_date | DATE | |
| status | VARCHAR | Default: 'active' |
| notes | TEXT | |

### `supplier_agents`

Supplier agent management.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| agent_name | VARCHAR | NOT NULL |
| company_name | VARCHAR | |
| phone | VARCHAR | |
| address | TEXT | |
| contracted_hajji | INTEGER | Default: 0 |
| contracted_amount | DECIMAL | Default: 0 |
| contract_date | DATE | |
| status | VARCHAR | Default: 'active' |
| notes | TEXT | |

### `accounts`

Chart of accounts (wallets).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | VARCHAR | NOT NULL |
| type | VARCHAR | cash, bank, mobile_banking |
| balance | DECIMAL | Default: 0 |

### `transactions`

Financial transaction ledger.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID | |
| booking_id | UUID | |
| customer_id | UUID | |
| type | VARCHAR | income, expense |
| category | VARCHAR | |
| amount | DECIMAL | |
| debit | DECIMAL | Default: 0 |
| credit | DECIMAL | Default: 0 |
| date | DATE | |
| source_type | VARCHAR | |
| source_id | UUID | |
| payment_method | VARCHAR | |
| reference | VARCHAR | |
| note | TEXT | |

### `site_content`

CMS content storage.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| section_key | VARCHAR | Unique |
| content | JSONB | `{ "en": {...}, "bn": {...} }` |
| updated_by | UUID | |
| updated_at | TIMESTAMPTZ | |

---

## Views

### `v_booking_profit`

Joins bookings with packages and calculates profit metrics per booking.

### `v_customer_profit`

Aggregates total bookings, payments, expenses, and profit per customer.

### `v_package_profit`

Aggregates total bookings, revenue, expenses, and profit per package.

---

## Security Triggers

| Trigger | Purpose |
|---------|---------|
| `protect_admin_role_insert` | Prevents assigning admin role to non-primary admin |
| `protect_admin_role_update` | Prevents changing primary admin's role |
| `protect_admin_role_delete` | Prevents deleting primary admin's role |
| `protect_admin_user` | Prevents deleting/banning primary admin user |
