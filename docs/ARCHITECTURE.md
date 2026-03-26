# Project Architecture — RAHE KABA Tours & Travels

> Visual architecture guide and component relationships

---

## System Architecture

```
                    ┌──────────────┐
                    │   Internet   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Nginx     │
                    │  (Reverse    │
                    │   Proxy)     │
                    └──┬───────┬───┘
                       │       │
            Static     │       │  /api/*
            Files      │       │
                       │       │
               ┌───────▼──┐  ┌─▼──────────┐
               │  React   │  │  Express   │
               │  Build   │  │  API       │
               │  (dist/) │  │  Port 3001 │
               └──────────┘  └─────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │ PostgreSQL  │
                            │ Port 5432   │
                            └─────────────┘
```

---

## Frontend Component Tree

```
App
├── QueryClientProvider
│   └── TooltipProvider
│       └── BrowserRouter
│           └── Routes
│               ├── / → Index
│               │   ├── Navbar
│               │   ├── HeroSection (3-image carousel)
│               │   ├── ServicesSection
│               │   ├── FacilitiesSection
│               │   ├── PackagesSection
│               │   ├── GuidelineSection (lazy)
│               │   ├── VideoGuideSection (lazy)
│               │   ├── GallerySection (lazy)
│               │   ├── TestimonialsSection (lazy)
│               │   ├── AboutSection (lazy)
│               │   ├── ContactSection (lazy)
│               │   ├── Footer
│               │   ├── WhatsAppFloat
│               │   └── BackToTop
│               │
│               ├── /auth → Auth
│               ├── /dashboard → Dashboard
│               ├── /packages → Packages
│               ├── /packages/:id → PackageDetail
│               ├── /hotels → Hotels
│               ├── /hotels/:id → HotelDetail
│               ├── /booking → Booking
│               ├── /track → TrackBooking
│               ├── /about → About
│               ├── /contact → Contact
│               │
│               └── /admin → AdminLayout
│                   ├── /admin → AdminDashboardPage
│                   ├── /admin/bookings → AdminBookingsPage
│                   ├── /admin/bookings/create → AdminCreateBookingPage
│                   ├── /admin/customers → AdminCustomersPage
│                   ├── /admin/packages → AdminPackagesPage
│                   ├── /admin/payments → AdminPaymentsPage
│                   ├── /admin/accounting → AdminAccountingPage
│                   ├── /admin/reports → AdminReportsPage
│                   ├── /admin/moallems → AdminMoallemsPage
│                   ├── /admin/moallems/:id → AdminMoallemProfilePage
│                   ├── /admin/supplier-agents → AdminSupplierAgentsPage
│                   ├── /admin/supplier-agents/:id → AdminSupplierAgentProfilePage
│                   ├── /admin/calculator → AdminCalculatorPage
│                   ├── /admin/hotels → AdminHotelsPage
│                   ├── /admin/notifications → AdminNotificationsPage
│                   ├── /admin/due-alerts → AdminDueAlertsPage
│                   ├── /admin/chart-of-accounts → AdminChartOfAccountsPage
│                   ├── /admin/receivables → AdminReceivablesPage
│                   ├── /admin/cms → AdminCmsPage
│                   └── /admin/settings → AdminSettingsPage
│
├── Toaster (toast notifications)
└── Sonner (sonner notifications)
```

---

## Data Flow

### Customer Booking Flow

```
Homepage → Select Package → /booking
  → Step 1: Personal Details (name, phone, passport)
  → Step 2: Package Selection + Travelers
  → Step 3: Payment Plan (full/installment)
  → Step 4: Confirmation
  → API: POST /api/bookings
  → DB: Insert into bookings + booking_members
  → Response: tracking_id
  → Redirect: /dashboard
```

### Admin Booking Flow

```
Admin → /admin/bookings/create
  → Select Customer or Guest
  → Select Package
  → Set pricing (cost, selling, commission)
  → Assign Moallem/Supplier (optional)
  → Set Installment Plan (optional)
  → API: POST /api/bookings
  → DB: bookings + booking_members + payments (if installment)
```

### Payment Flow

```
Admin → /admin/payments
  → Select Booking
  → Enter Amount + Method + Wallet Account
  → API: POST /api/payments
  → DB: payments table
  → Update: bookings.paid_amount, bookings.due_amount
  → Optional: Create transaction record
  → Optional: Send notification (SMS/Email)
```

---

## Third-Party Integrations

| Service | Purpose | Configuration |
|---------|---------|---------------|
| SMS API | Send notifications | Admin Settings → SMS Config |
| SMTP | Send emails | Admin Settings → Email Config |
| Google Drive | Backup storage | `server/backup-to-gdrive.sh` |

---

## File Storage

```
server/uploads/
├── receipts/          # Payment receipt images
├── documents/         # Booking documents (passport, visa)
├── packages/          # Package images
├── hotels/            # Hotel images
└── backups/           # Database backups
```
