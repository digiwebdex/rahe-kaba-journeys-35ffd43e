# RAHE KABA Tours & Travels — Developer Documentation (A-Z)

> **Last Updated:** March 2026  
> **Version:** 2.x  
> **Repository:** https://github.com/digiwebdex/rahe-kaba-journeys-f977239d

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Frontend](#frontend)
6. [Backend (Server)](#backend-server)
7. [Database](#database)
8. [Authentication & Authorization](#authentication--authorization)
9. [Internationalization (i18n)](#internationalization-i18n)
10. [CMS System](#cms-system)
11. [Notification System](#notification-system)
12. [PDF & Report Generation](#pdf--report-generation)
13. [Admin ERP Panel](#admin-erp-panel)
14. [Deployment](#deployment)
15. [Environment Variables](#environment-variables)
16. [API Reference](#api-reference)
17. [Security](#security)
18. [Testing](#testing)

---

## 1. Project Overview

RAHE KABA Tours & Travels is a full-stack Hajj & Umrah travel management ERP system. It features:

- **Public Website** — Bilingual (Bangla/English) landing page with packages, hotels, services, testimonials, guideline sections
- **Customer Portal** — Booking, payment tracking, invoice downloads, document uploads
- **Admin ERP** — Complete business management: bookings, payments, customers, moallems, supplier agents, accounting, reports, CMS, notifications, settings

---

## 2. Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  React/Vite (SPA)   │────▶│  Node.js/Express API │────▶│  PostgreSQL DB  │
│  Port: 80/443       │     │  Port: 3001          │     │  Port: 5432     │
│  (Nginx reverse)    │     │  (PM2 managed)       │     │                 │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
```

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express (self-hosted on VPS)
- **Database:** PostgreSQL (self-hosted on VPS)
- **Process Manager:** PM2 (`rahekaba-api`)
- **Web Server:** Nginx (serves static build + reverse proxy to API)

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| State Management | React Query (TanStack) |
| Routing | React Router v6 |
| Animation | Framer Motion |
| Charts | Recharts |
| PDF Generation | jsPDF + jspdf-autotable |
| Excel Export | xlsx (SheetJS) |
| QR Code | qrcode |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (bcrypt + jsonwebtoken) |
| File Upload | Multer |
| Process Manager | PM2 |

---

## 4. Directory Structure

```
/
├── docs/                    # Documentation files
├── public/                  # Static assets
├── server/                  # Backend Express API
│   ├── config/database.js   # PostgreSQL connection pool
│   ├── middleware/auth.js   # JWT authentication middleware
│   ├── routes/auth.js       # Authentication routes
│   ├── index.js             # Main API server (all routes)
│   ├── schema.sql           # Complete database schema
│   └── uploads/             # File upload storage
├── src/
│   ├── assets/              # Images, logos
│   ├── components/
│   │   ├── admin/           # Admin panel components
│   │   ├── booking/         # Booking flow components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── Navbar.tsx       # Main navigation
│   │   ├── HeroSection.tsx  # Hero with 3-image carousel
│   │   ├── ServicesSection.tsx
│   │   ├── FacilitiesSection.tsx
│   │   ├── PackagesSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── ContactSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── GuidelineSection.tsx
│   │   ├── VideoGuideSection.tsx
│   │   ├── GallerySection.tsx
│   │   ├── Footer.tsx
│   │   ├── WhatsAppFloat.tsx
│   │   └── BackToTop.tsx
│   ├── hooks/               # Custom React hooks
│   ├── i18n/                # Language translations
│   ├── lib/                 # Utility functions, API client, PDF generators
│   ├── pages/
│   │   ├── admin/           # Admin page components
│   │   ├── Index.tsx        # Homepage
│   │   ├── Auth.tsx         # Login/Register
│   │   ├── Dashboard.tsx    # Customer dashboard
│   │   ├── Booking.tsx      # Booking flow
│   │   └── ...
│   └── integrations/        # Supabase types (auto-generated, read-only)
├── supabase/                # Edge functions (Lovable Cloud)
└── package.json
```

---

## 5. Frontend

### Key Patterns

- **Lazy Loading:** All non-homepage routes are lazy-loaded via `React.lazy()` for optimal initial load
- **Design System:** All colors use semantic HSL tokens defined in `index.css` and `tailwind.config.ts`
- **Component Library:** shadcn/ui with custom variants
- **API Client:** `src/lib/api.ts` exports `supabase` client and helper functions that talk to the self-hosted backend

### Important Files

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | API client, Supabase proxy, `getUser()` helper |
| `src/lib/invoiceGenerator.ts` | PDF invoice generation |
| `src/lib/entityPdfGenerator.ts` | PDF generation for moallem/supplier reports |
| `src/lib/reportExport.ts` | Excel export utility |
| `src/lib/pdfFontLoader.ts` | Bengali font loading for PDFs |
| `src/lib/pdfSignature.ts` | Digital signature for invoices |
| `src/lib/pdfQrCode.ts` | QR code generation for invoices |

### Hero Section

- 3 auto-sliding images (Kaaba, Medina, Hotel) with 5-second interval
- Navigation arrows and dot indicators
- Quranic verse with Arabic + Bengali translation

### Language System

- Default language: **Bangla (bn)**
- Toggle: English ↔ Bangla via Globe button in navbar
- Stored in `localStorage` key `rk_language`
- All translations in `src/i18n/translations.ts`

---

## 6. Backend (Server)

### Location: `server/`

### Entry Point: `server/index.js`

The backend uses a generic CRUD helper pattern:

```javascript
const createCrudRoutes = (tableName, options = {}) => { ... }
```

This generates standard REST endpoints for any table:
- `GET /api/{table}` — List with filters, pagination
- `GET /api/{table}/:id` — Get single record
- `POST /api/{table}` — Create
- `PUT /api/{table}/:id` — Update
- `DELETE /api/{table}/:id` — Delete

### Custom Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login (JWT) |
| `/api/auth/me` | GET | Get current user + role |
| `/api/auth/change-password` | POST | Admin password change |
| `/api/bookings` | CRUD | Booking management |
| `/api/payments` | CRUD | Payment management |
| `/api/packages` | CRUD | Package management |
| `/api/hotels` | CRUD | Hotel management |
| `/api/moallems` | CRUD | Moallem management |
| `/api/supplier-agents` | CRUD | Supplier agent management |
| `/api/accounts` | CRUD | Chart of accounts |
| `/api/transactions` | CRUD | Transaction ledger |
| `/api/expenses` | CRUD | Expense tracking |
| `/api/daily-cashbook` | CRUD | Daily cashbook |
| `/api/notification-settings` | CRUD | Notification config |
| `/api/site-content` | CRUD | CMS content |
| `/api/company-settings` | CRUD | Company settings |
| `/api/backup` | GET/POST | Database backup/restore |

---

## 7. Database

### Engine: PostgreSQL

### Schema: `server/schema.sql` (1268 lines)

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Authentication (email, password hash, role ref) |
| `user_roles` | Role assignments (admin, user, manager, staff, viewer, accountant, booking, cms) |
| `profiles` | User profile data |
| `packages` | Hajj/Umrah/Tour packages |
| `bookings` | Customer bookings |
| `booking_members` | Individual travelers per booking |
| `payments` | Payment records |
| `moallems` | Moallem (agent/referrer) management |
| `moallem_payments` | Payments to moallems |
| `moallem_commission_payments` | Commission payments |
| `supplier_agents` | Supplier agent management |
| `supplier_agent_payments` | Payments to suppliers |
| `supplier_contracts` | Supplier contracts |
| `supplier_contract_payments` | Contract payments |
| `hotels` | Hotel listings |
| `hotel_rooms` | Room details |
| `hotel_bookings` | Hotel reservations |
| `accounts` | Chart of accounts |
| `transactions` | Financial transactions |
| `expenses` | Expense records |
| `daily_cashbook` | Daily cash entries |
| `financial_summary` | Aggregated financial data |
| `site_content` | CMS content (JSONB) |
| `cms_versions` | CMS version history |
| `blog_posts` | Blog content |
| `notification_settings` | Notification config |
| `notification_logs` | Notification history |
| `company_settings` | App-wide settings |
| `booking_documents` | Uploaded documents |
| `installment_plans` | Installment plan definitions |
| `otp_codes` | OTP verification |

### Views

| View | Purpose |
|------|---------|
| `v_booking_profit` | Booking profit analysis |
| `v_customer_profit` | Customer profitability |
| `v_package_profit` | Package profitability |

### Security

- Admin role is permanently locked to a single user ID
- Triggers prevent admin role assignment/deletion
- JWT-based authentication with bcrypt password hashing

---

## 8. Authentication & Authorization

### Flow

1. User registers via `/api/auth/register` (email + password + phone)
2. Password is hashed with `bcrypt` (10 rounds)
3. JWT token issued on login (24h expiry)
4. Frontend stores token in `localStorage`
5. All protected API calls include `Authorization: Bearer <token>` header

### Roles

| Role | Access |
|------|--------|
| `admin` | Full system access |
| `manager` | Booking + financial management |
| `staff` | Booking operations |
| `accountant` | Financial modules only |
| `booking` | Booking module only |
| `cms` | CMS module only |
| `viewer` | Read-only access |
| `user` | Customer portal only |

### Session Timeout

- Configured via `useSessionTimeout` hook
- Auto-logout after inactivity period

---

## 9. Internationalization (i18n)

### Files

- `src/i18n/LanguageContext.tsx` — Provider + hook
- `src/i18n/translations.ts` — All translation strings

### Default Language: **Bangla (bn)**

### Usage

```tsx
const { t, language, setLanguage } = useLanguage();
// t("nav.home") → "হোম" (in Bangla) or "Home" (in English)
```

### CMS Override

Site content from DB can override hardcoded translations. Priority:
1. Language-specific CMS data
2. Hardcoded Bangla translations
3. English CMS data (fallback)

---

## 10. CMS System

### Storage: `site_content` table

Content is stored as JSONB with `en` and `bn` keys:

```json
{
  "en": { "heading": "Welcome", "description": "..." },
  "bn": { "heading": "স্বাগতম", "description": "..." }
}
```

### Sections

- `hero` — Hero section content
- `navbar` — Phone number, branding
- `services` — Service descriptions
- `about` — About section
- `contact` — Contact information
- `footer` — Footer content

### Version History

Every CMS update creates a record in `cms_versions` for rollback capability.

---

## 11. Notification System

### Channels

- **SMS** — Via configured SMS API (settings stored in `company_settings`)
- **Email** — Via SMTP configuration

### Configuration

Admin can configure SMS/Email settings from **Admin → Settings → SMS/Email Configuration**:
- SMTP host, port, user, password
- SMS API endpoint, API key, sender ID

### Notification Events

- Booking created
- Payment received
- Payment due reminder
- Booking status update

### Logs

All notifications are logged in `notification_logs` table with delivery status.

---

## 12. PDF & Report Generation

### Invoice PDF

- Generated via `jsPDF` + `jspdf-autotable`
- Includes company logo, QR code, digital signature
- Bengali font support via custom font loader
- QR code links to verification URL

### Reports

- Financial reports exportable as PDF/Excel
- Customer financial reports
- Moallem/Supplier payment reports
- Daily cashbook reports

---

## 13. Admin ERP Panel

### URL: `/admin`

### Modules

| Module | Route | Features |
|--------|-------|----------|
| Dashboard | `/admin` | Charts, stats, recent activity |
| Bookings | `/admin/bookings` | CRUD, status management, invoice |
| Create Booking | `/admin/bookings/create` | Multi-step booking form |
| Customers | `/admin/customers` | Customer profiles, financial reports |
| Packages | `/admin/packages` | Package CRUD, image upload |
| Payments | `/admin/payments` | Record & manage payments |
| Moallems | `/admin/moallems` | Agent management, commissions |
| Supplier Agents | `/admin/supplier-agents` | Supplier management, contracts |
| Accounting | `/admin/accounting` | Transactions, expenses, cashbook |
| Chart of Accounts | `/admin/chart-of-accounts` | Wallet/account management |
| Receivables | `/admin/receivables` | Due payment tracking |
| Due Alerts | `/admin/due-alerts` | Overdue payment alerts |
| Reports | `/admin/reports` | Financial & business reports |
| Hotels | `/admin/hotels` | Hotel & room management |
| Notifications | `/admin/notifications` | Notification logs & settings |
| CMS | `/admin/cms` | Website content management |
| Calculator | `/admin/calculator` | Profit calculator |
| Settings | `/admin/settings` | Password change, backup, SMS/Email config |

### Language

Admin ERP is **English-only** (data entries may be in Bengali).

### Currency

All monetary values displayed as `BDT` (not ৳ symbol).

---

## 14. Deployment

See `docs/DEPLOYMENT.md` for full deployment guide.

### Quick Deploy

```bash
cd /var/www/rahe-kaba-journeys-72ccca69 && git pull && npm run build && pm2 restart rahekaba-api
```

---

## 15. Environment Variables

### Frontend (`.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | API base URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | API key |

### Backend (`server/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `PORT` | API server port (default: 3001) |
| `FRONTEND_URL` | CORS origin |

> ⚠️ `.env` files are git-ignored and protected with `git update-index --skip-worktree`

---

## 16. API Reference

See `docs/API_REFERENCE.md` for complete endpoint documentation.

---

## 17. Security

- JWT authentication with 24h expiry
- bcrypt password hashing (10 rounds)
- Admin role permanently locked via DB triggers
- CORS configured per environment
- File upload size limited to 5MB
- SQL parameterized queries (no raw string interpolation)
- Rate limiting via Nginx
- Environment variables protected from git operations

---

## 18. Testing

### Framework: Vitest

### Test Files

- `src/test/example.test.ts` — Basic tests
- `src/test/financial.test.ts` — Financial calculation tests

### Running Tests

```bash
npm test
# or
npx vitest
```
