# Change History — RAHE KABA Tours & Travels

> Complete log of all major changes and feature implementations

---

## March 2026

### Week 4 (Latest)

#### Frontend Redesign — Light Theme
- Changed from dark navy to light cream/gold luxury aesthetic
- Updated all CSS tokens: background, foreground, primary, secondary, muted, accent
- Implemented Playfair Display + Inter font pairing
- Added `.shadow-luxury`, `.shadow-soft`, `.islamic-pattern` utilities

#### Hero Section — 3-Image Carousel
- Replaced single dark hero with 3 auto-sliding images:
  1. Kaaba at golden sunset
  2. Masjid an-Nabawi Medina
  3. Premium hotel near Haram
- Added navigation arrows and dot indicators
- 5-second auto-transition with fade/scale animation

#### Default Language → Bangla
- Changed default from English to Bangla (bn)
- Updated `LanguageContext.tsx` — default state `"bn"`
- Updated fallback to prioritize Bangla translations
- Navbar shows "English" button when in Bangla mode

#### New Facilities Section
- Added 9 facility cards inspired by kafela.digiwebdex.com:
  - Umrah Visa with Insurance
  - Direct & Transit Flights
  - Premium Hotels Near Haram
  - Private Transportation
  - Umrah Training
  - Expert Bangladeshi Guides
  - 24/7 Customer Support
  - Transparent Pricing
  - Customized Packages
- Full Bangla/English translation support

#### Package Cards Redesign
- Image overlay with gradient fade
- Price shown on image overlay
- Star rating badge (top-right)
- Type badge (top-left)
- Duration and meta info row with icons
- Rounded-2xl with luxury shadow on hover

#### WhatsApp & Back to Top
- WhatsApp button moved to bottom-left with Bengali label: "আপনাকে কিভাবে সহযোগিতা করতে পারি"
- Added animated Back to Top button (bottom-right)
- Framer Motion animations for entry/exit

#### Calligraphic Islamic Design
- Islamic geometric pattern overlays
- Gold gradient border-top dividers between sections
- Section ornament decorators (✦ stars)
- Card hover top-border reveal animation

### Week 3

#### Admin Settings Enhancements
- SMS/Email Configuration — SMTP host, port, user, password fields; SMS API endpoint, key, sender ID
- Admin Password Change — Accessible from Settings page
- Manual Backup/Restore — Database backup download and SQL restore upload

#### Notification System Fix
- Fixed "Failed to load notification settings" error
- Added proper fallback for missing notification_settings records
- Ensured notification settings CRUD works for all event types

### Week 2

#### ERP Admin Panel — English Migration
- All admin panel text migrated to English
- Currency symbol ৳ replaced with "BDT" globally
- Bengali retained only for user data entries
- PDF/Excel reports in English

#### Financial System
- Customer Financial Report component
- Daily Cashbook module
- Supplier Contract Manager
- Chart of Accounts management
- Receivables tracking

### Week 1

#### VPS Migration
- Migrated from Supabase cloud to self-hosted PostgreSQL + Express
- Created complete schema.sql (1268 lines)
- JWT authentication system
- Generic CRUD route generator
- Data migration scripts

---

## February 2026

### Core Features Built
- Public website with all sections
- Customer authentication (register/login)
- Booking system with multi-step flow
- Payment tracking with installment plans
- Customer dashboard
- Invoice generation with QR codes
- Hotel booking system
- Moallem management system
- Supplier agent management
- CMS content management with version history
- Bilingual support (Bangla/English)

### Initial Setup
- Project created with React/Vite
- Supabase integration (later migrated)
- shadcn/ui component library
- Tailwind CSS theming
- Route structure with lazy loading
