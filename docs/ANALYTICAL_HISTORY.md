# Analytical History — RAHE KABA Tours & Travels

> System analytics, performance metrics, and data insights

---

## System Analytics Overview

### Application Metrics

| Metric | Value |
|--------|-------|
| Total Pages | 25+ |
| Admin Modules | 18 |
| Database Tables | 28 |
| Database Views | 3 |
| API Endpoints | 50+ |
| Translation Keys | 300+ |
| Components | 60+ |
| Edge Functions | 12 |

### Bundle Analysis

| Module | Strategy |
|--------|----------|
| Homepage | Eagerly loaded (critical path) |
| Admin Panel | Lazy loaded (code-split) |
| Auth Pages | Lazy loaded |
| Dashboard | Lazy loaded |
| Heavy Libraries (recharts, xlsx, jspdf) | Lazy loaded via admin routes |

### Performance Optimizations

1. **Lazy Loading:** All non-homepage routes use `React.lazy()` + `Suspense`
2. **Image Optimization:** Hero images with `fetchPriority="high"`, others with `loading="lazy"`
3. **Font Strategy:** Google Fonts (Playfair Display, Inter, Amiri) with display=swap
4. **CSS:** Tailwind CSS with purge — only used classes in production bundle
5. **State Management:** React Query with intelligent caching/refetching

---

## Database Analytics

### Table Relationships

```
users ──┬── user_roles
        ├── profiles
        └── bookings ──┬── booking_members
                       ├── payments
                       ├── booking_documents
                       ├── expenses
                       └── notification_logs

packages ──── bookings
           └── booking_members

moallems ──┬── bookings
           ├── moallem_payments
           ├── moallem_commission_payments
           └── moallem_items

supplier_agents ──┬── bookings
                  ├── supplier_agent_payments
                  ├── supplier_agent_items
                  ├── supplier_contracts ── supplier_contract_payments
                  └── accounts

hotels ──┬── hotel_rooms
         └── hotel_bookings

accounts ──── daily_cashbook
          └── (all payment tables via wallet_account_id)
```

### Financial Analysis Views

| View | Metrics |
|------|---------|
| `v_booking_profit` | Revenue, cost, expenses, profit per booking |
| `v_customer_profit` | Total bookings, payments, expenses, profit per customer |
| `v_package_profit` | Total bookings, revenue, expenses, profit per package |

---

## Feature Usage Analytics

### Public Website Sections

| Section | Component | Data Source |
|---------|-----------|-------------|
| Hero | `HeroSection.tsx` | CMS (`site_content.hero`) + static |
| Services | `ServicesSection.tsx` | Translations (i18n) |
| Facilities | `FacilitiesSection.tsx` | Translations (i18n) |
| Packages | `PackagesSection.tsx` | Database (`packages` table) |
| Guidelines | `GuidelineSection.tsx` | Static content |
| Video Guide | `VideoGuideSection.tsx` | Local video files |
| Gallery | `GallerySection.tsx` | Static images |
| Testimonials | `TestimonialsSection.tsx` | Static/CMS |
| About | `AboutSection.tsx` | CMS + Translations |
| Contact | `ContactSection.tsx` | CMS + Translations |

### Admin Module Usage

| Module | Primary Tables | Reports |
|--------|---------------|---------|
| Dashboard | All tables | Charts (recharts) |
| Bookings | bookings, booking_members | PDF invoice, Excel |
| Customers | profiles, bookings, payments | Financial report PDF |
| Packages | packages | — |
| Payments | payments | Receipt PDF |
| Moallems | moallems, moallem_payments | Profile report PDF |
| Suppliers | supplier_agents, supplier_agent_payments | Profile report PDF |
| Accounting | transactions, expenses | Ledger report |
| Cashbook | daily_cashbook | Daily report |
| Hotels | hotels, hotel_rooms, hotel_bookings | — |
| Notifications | notification_settings, notification_logs | — |
| CMS | site_content, cms_versions | — |

---

## Security Analysis

### Authentication Flow

```
User → POST /api/auth/login
     → Server validates credentials (bcrypt)
     → Server issues JWT (24h expiry)
     → Client stores in localStorage
     → All API calls include Bearer token
     → Server validates JWT on protected routes
     → Server checks user role for admin routes
```

### Role-Based Access Control

| Role | Dashboard | Bookings | Payments | Accounting | Reports | Settings |
|------|-----------|----------|----------|------------|---------|----------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| staff | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| accountant | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| booking | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| cms | ❌ | ❌ | ❌ | ❌ | ❌ | CMS only |
| viewer | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ |

---

## Internationalization Coverage

| Section | English | Bangla |
|---------|---------|--------|
| Navbar | ✅ | ✅ |
| Hero | ✅ | ✅ |
| Services | ✅ | ✅ |
| Facilities | ✅ | ✅ |
| Packages | ✅ | ✅ |
| About | ✅ | ✅ |
| Contact | ✅ | ✅ |
| Auth | ✅ | ✅ |
| Booking | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Hotels | ✅ | ✅ |
| Footer | ✅ | ✅ |
| Admin Panel | ✅ (English only) | ❌ |
