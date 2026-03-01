# CDL Jobs Center — Full QA Manual Testing Plan

> Generated 2026-03-01. Covers every route, role, feature, form, modal, edge function, and integration.

---

## Table of Contents

1. [Routes Inventory](#1-routes-inventory)
2. [Public Pages](#2-public-pages)
3. [Auth Flows](#3-auth-flows)
4. [Modals & Dialogs](#4-modals--dialogs)
5. [Company Dashboard](#5-company-dashboard)
6. [Driver Dashboard](#6-driver-dashboard)
7. [Admin Dashboard](#7-admin-dashboard)
8. [AI Matching System](#8-ai-matching-system)
9. [Notifications System](#9-notifications-system)
10. [Chat / Messaging](#10-chat--messaging)
11. [Subscriptions & Stripe](#11-subscriptions--stripe)
12. [Leads System](#12-leads-system)
13. [Navbar & Navigation](#13-navbar--navigation)
14. [Dark Mode / Theme](#14-dark-mode--theme)
15. [Edge Functions](#15-edge-functions)
16. [Error & Edge Cases](#16-error--edge-cases)
17. [Security & Headers](#17-security--headers)
18. [Nav & Auth Loading Behavior](#18-nav--auth-loading-behavior)
19. [Notification Preferences](#19-notification-preferences)
20. [Responsive / Mobile](#20-responsive--mobile)
21. [SEO & Meta](#21-seo--meta)
22. [Performance & Polling](#22-performance--polling)
23. [Cross-Browser & Deployment](#23-cross-browser--deployment)

---

## 1. Routes Inventory

| # | Route | Component | Auth | Role |
|---|-------|-----------|------|------|
| 1 | `/` | Index | No | Public |
| 2 | `/jobs` | Jobs | No | Public |
| 3 | `/jobs/:id` | JobDetail | No (apply gated) | Public |
| 4 | `/apply` | ApplyNow | Soft gate | Driver |
| 5 | `/companies` | Companies | No | Public |
| 6 | `/companies/:id` | CompanyProfile | No | Public |
| 7 | `/drivers` | Drivers | Company gated | Company |
| 8 | `/drivers/:id` | DriverProfile | Company gated | Company |
| 9 | `/dashboard` | Dashboard | Yes | Company |
| 10 | `/driver-dashboard` | DriverDashboard | Yes | Driver |
| 11 | `/pricing` | Pricing | No | Public |
| 12 | `/admin` | AdminDashboard | Yes | Admin |
| 13 | `/signin` | SignIn | No | Public |
| 14 | `/privacy` | PrivacyPolicy | No | Public |
| 15 | `/terms` | TermsOfService | No | Public |
| 16 | `/saved-jobs` | Redirect → `/driver-dashboard` | — | — |
| 17 | `/my-applications` | Redirect → `/driver-dashboard` | — | — |
| 18 | `*` | NotFound (404) | No | — |

---

## 2. Public Pages

### 2.1 Home (`/`)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Page loads without errors | All sections render: Hero, HowItWorks, JobCategories, TopCompanies, Stats, Reviews, CTA, Footer | |
| 2 | "Find Jobs" CTA | Navigates to `/jobs` | |
| 3 | "Apply Now" CTA | Navigates to `/apply` | |
| 4 | "Browse Companies" CTA | Navigates to `/companies` | |
| 5 | Job category links | Navigate to `/jobs?type=<category>` with correct filter | |
| 6 | TopCompanies section | Loads companies from Supabase; shows logos | |
| 7 | Responsive layout | Renders correctly on mobile, tablet, desktop | |

### 2.2 Jobs (`/jobs`)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Default load | All active jobs displayed | |
| 2 | Search by text | Matches title, company, location, description | |
| 3 | Filter: Freight Type | Narrows results to selected freight type | |
| 4 | Filter: Driver Type | Narrows results correctly | |
| 5 | Filter: Route Type | Narrows results correctly | |
| 6 | Filter: Team Driving | Shows only team/solo jobs | |
| 7 | Combined filters | Multiple filters narrow results together | |
| 8 | Sort: Newest | Jobs ordered by created_at desc | |
| 9 | Sort: Company A-Z | Alphabetical by company name | |
| 10 | Sort: Title A-Z | Alphabetical by title | |
| 11 | Sort: Best Match (driver only) | Shows only for signed-in drivers; sorts by match score | |
| 12 | Pagination (10/page) | Next/Prev work; page resets on filter change | |
| 13 | URL params persist on refresh | `?freight=Dry+Van&driver=company` survives reload | |
| 14 | Save job (driver signed in) | Star toggles; saved_jobs row inserted/deleted | |
| 15 | Save job (guest) | Prompts sign-in modal | |
| 16 | "Already Applied" badge | Shows on jobs where driver has prior application | |
| 17 | EasyApply button | Opens EasyApplyDialog from job card | |
| 18 | Empty state | "No jobs found" shown when filters match nothing | |
| 19 | Reset filters | Clears all filters and URL params | |

### 2.3 Job Detail (`/jobs/:id`)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Job data loads | Title, company, location, pay, type, description all correct | |
| 2 | Company logo | Renders from company_profiles if present | |
| 3 | Company info | Phone, address, website from company_profiles | |
| 4 | Match score badge (driver) | Visible for signed-in drivers | |
| 5 | Apply Now (guest) | Opens SignInModal | |
| 6 | Apply Now (driver) | Opens ApplyModal | |
| 7 | Apply Now (company) | Toast error "drivers only" or similar | |
| 8 | "Already Applied" badge | Shows when application exists | |
| 9 | Invalid job ID | Toast "Job not found" + redirect to `/jobs` | |
| 10 | Back navigation | Returns to previous page | |

### 2.4 Companies (`/companies`)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Companies load | List from company_profiles | |
| 2 | State filter | Narrows results by state | |
| 3 | Company cards | Show logo, name, address, phone, website | |
| 4 | Click company | Navigates to `/companies/:id` | |
| 5 | Empty state | Shows when no companies | |
| 6 | Error state | Retry button shown on fetch failure | |

### 2.5 Company Profile (`/companies/:id`)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Profile data | Name, address, about, phone, website, logo | |
| 2 | Active jobs list | Company's active jobs shown | |
| 3 | Quick Apply button | Opens EasyApplyDialog | |

### 2.6 Drivers (`/drivers`)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Company user access | Full driver details visible (phone, email) | |
| 2 | Non-company access | Contact info gated (lock icon) | |
| 3 | Filter: License Class | Narrows results | |
| 4 | Filter: Experience | Narrows results | |
| 5 | Click driver | Navigates to `/drivers/:id` | |
| 6 | Empty state | Shown when no profiles | |

### 2.7 Pricing (`/pricing`)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Three plans displayed | Starter ($49/25), Growth ($149/100), Unlimited ($299/unlimited) | |
| 2 | Current plan highlighted | For signed-in company with active subscription | |
| 3 | "Most Popular" badge | Shows on Growth plan | |
| 4 | Subscribe (guest) | Redirects to `/signin` | |
| 5 | Subscribe (driver) | Toast "Only company accounts can subscribe" | |
| 6 | Subscribe (company) | Stripe Checkout redirect via `create-checkout` | |
| 7 | 15s timeout | Error toast if Stripe slow | |
| 8 | Subscription status | Current period and status visible for subscribers | |

### 2.8 Static Pages

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Privacy Policy (`/privacy`) | Content renders with Navbar + Footer | |
| 2 | Terms of Service (`/terms`) | Content renders with Navbar + Footer | |
| 3 | 404 page (any unknown route) | NotFound renders; link to home works | |
| 4 | `/saved-jobs` redirect | Redirects to `/driver-dashboard` | |
| 5 | `/my-applications` redirect | Redirects to `/driver-dashboard` | |

---

## 3. Auth Flows

### 3.1 Sign In

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Valid email + password | Signs in; redirects based on role | |
| 2 | Invalid credentials | Toast "Sign in failed" | |
| 3 | Empty fields | Validation error shown | |
| 4 | Driver sign-in | Redirects to `/` (or previous page) | |
| 5 | Company sign-in | Redirects to `/` (or previous page) | |
| 6 | Admin sign-in | Redirects appropriately | |

### 3.2 Registration (Driver)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | All required fields filled | Account created; driver_profiles upserted; confirm-email view shown | |
| 2 | Password < 12 chars | Client-side toast "Password must be at least 12 characters"; server also rejects | |
| 3 | Password mismatch | Error "Passwords do not match" | |
| 4 | Duplicate email | Error "already registered" | |
| 5 | Missing required field | Validation error | |

### 3.3 Registration (Company)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | All required fields filled | Account created; company_profiles upserted; confirm-email view | |
| 2 | Password < 12 chars | Rejected | |
| 3 | Missing company name | Validation error | |

### 3.4 Password Reset

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Valid email submitted | Reset email sent (via Brevo SMTP) | |
| 2 | Check email content | Uses branded recovery.html template | |
| 3 | Click reset link | Opens app with reset token | |
| 4 | Set new password | Password updated; can sign in with new password | |
| 5 | Invalid email | Error or generic "check your email" message | |

### 3.5 Email Confirmation

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Confirmation email received | Uses branded confirmation.html template | |
| 2 | Click confirmation link | Email confirmed; user can sign in | |
| 3 | Resend confirmation | New email sent | |

### 3.6 Session & Sign Out

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Refresh page while signed in | Session persists (Supabase localStorage) | |
| 2 | Sign out | State cleared; query cache cleared; redirect to home | |
| 3 | Sign out modal | Confirmation modal shown; cancel returns to app | |
| 4 | Token expiry | Automatic sign-out behavior | |

### 3.7 Role Guards

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Driver accessing `/dashboard` | Redirect to `/` with toast | |
| 2 | Company accessing `/driver-dashboard` | Redirect to `/` with toast | |
| 3 | Guest accessing `/dashboard` | Redirect to `/` with toast | |
| 4 | Guest accessing `/driver-dashboard` | Redirect to `/` with toast | |
| 5 | Non-admin accessing `/admin` | Redirect to `/` with toast | |

---

## 4. Modals & Dialogs

### 4.1 SignInModal

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Login view: valid credentials | Signs in; modal closes | |
| 2 | Login view: invalid credentials | Inline error toast | |
| 3 | "Forgot it?" link | Opens forgot password view | |
| 4 | "Registration" link | Opens rules view | |
| 5 | Rules view: Accept | Opens register view | |
| 6 | Rules view: Decline | Returns to login view | |
| 7 | Register: role switcher | Driver ↔ Company toggles correct form fields | |
| 8 | Confirm email view | Shows correct email; "Resend" works | |
| 9 | Close (X) button | Dismisses from any view | |
| 10 | Triggered from: Navbar | Opens correctly | |
| 11 | Triggered from: Job card save | Opens correctly | |
| 12 | Triggered from: Apply button | Opens correctly | |

### 4.2 ApplyModal (Full Application)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Pre-fills from driver_profiles | Name, email, phone, CDL#, etc. auto-filled | |
| 2 | Required field validation | firstName, lastName, email, phone, CDL#, zip, driverType, licenseClass, yearsExp, licenseState | |
| 3 | Email format validation | Invalid email rejected | |
| 4 | Zip code validation | 5-digit or zip+4 format | |
| 5 | Toggle sections | Preferences, Endorsements, Hauler, Route, Extra questions expand/collapse | |
| 6 | Solo/Team select | Solo / Team / Either options work | |
| 7 | Notes textarea | Word count displayed | |
| 8 | Submit success | INSERT to applications; toast "Application submitted"; modal closes; cache invalidated | |
| 9 | Submit timeout (30s) | Error toast | |
| 10 | Cancel button | Closes without submitting | |
| 11 | Guest user | Toast "Please sign in" | |

### 4.3 EasyApplyDialog (Quick Apply)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Pre-fills from profile | Name, email, phone auto-filled | |
| 2 | Required fields | First name, last name, email, phone | |
| 3 | Email validation | Invalid format rejected | |
| 4 | CDL / Owner Operator toggles | ON/OFF work | |
| 5 | Submit success | INSERT to applications; toast; dialog closes | |
| 6 | Non-driver user | Toast "must be signed in as a driver" | |
| 7 | Unauthenticated user | Toast "must be signed in as a driver" | |
| 8 | Timeout (30s) | Error toast | |

### 4.4 Admin Plan Change Dialog

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Opens from subscription row | Shows current plan | |
| 2 | Select new plan | Dropdown works | |
| 3 | Confirm change | Calls useChangeSubscriptionPlan; dialog closes; list refreshes | |

---

## 5. Company Dashboard (`/dashboard`)

### 5.1 Auth & Navigation

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Non-company user | Redirected to `/` with toast | |
| 2 | Tab state in URL | `?tab=jobs` persists on refresh | |
| 3 | Tab switching | All tabs render without errors | |
| 4 | Unread badge on Messages tab | Shows count from useUnreadCount | |

### 5.2 Jobs Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Create new job | All required fields (title, driverType, type, routeType, location); INSERT to jobs | |
| 2 | Edit existing job | Pre-fills form; UPDATE in place | |
| 3 | Delete job | Confirmation dialog; removes from list | |
| 4 | Job status badges | Green=Active, Amber=Paused, Red=Closed, Slate=Draft | |
| 5 | Draft jobs hidden from `/jobs` | Only Active jobs shown publicly | |
| 6 | Status change | Dropdown: Draft/Active/Paused/Closed → Supabase UPDATE | |

### 5.3 Applications Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | All applications load | From applications table where company_id matches | |
| 2 | Expand/collapse cards | "View Details" toggles | |
| 3 | Deep link `?app=<id>` | Auto-scrolls and highlights target card | |
| 4 | Driver fields shown | Driver type, experience, license, endorsements, hauler, route, notes | |

### 5.4 Pipeline Tab (Kanban)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | 5 columns render | New, Reviewing, Interview, Hired, Rejected | |
| 2 | Drag card between columns | Optimistic update + Supabase UPDATE pipeline_stage | |
| 3 | Dropdown stage selector | Alternative to drag; works correctly | |
| 4 | Drop target highlights | Visual feedback on drag-over | |
| 5 | Empty column placeholder | Dashed "Empty" shown; "Drop here" on hover | |
| 6 | DragOverlay | Ghost card shown while dragging (rotated) | |

### 5.5 Profile Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Load existing profile | Fields populated from company_profiles | |
| 2 | Edit fields | Name, email, phone, address, about, website | |
| 3 | Logo upload | File picker → upload to company-logos bucket → logo_url saved | |
| 4 | Save button states | Disabled when clean; "Saving…" → "Saved" | |
| 5 | Unsaved changes indicator | Shown when form is dirty | |

### 5.6 Analytics Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Chart renders | Bar chart of applications over time | |
| 2 | Stats displayed | Key metrics shown correctly | |

### 5.7 Messages Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Conversation list loads | Conversations keyed by application_id | |
| 2 | Select conversation | Chat window shows message thread | |
| 3 | Send message | Enter key or Send button; appears immediately | |
| 4 | Shift+Enter | Inserts newline (does NOT send) | |
| 5 | Mark as read | Unread count resets when conversation opened | |
| 6 | Mobile layout | List → chat → back button flow | |
| 7 | Empty state | "No conversations yet" with hint | |
| 8 | Deep link `?app=<id>` | Pre-selects correct conversation | |

### 5.8 Leads Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Leads load | From leads table filtered by company_id | |
| 2 | Auto-refresh | Every 60 seconds | |
| 3 | Status change | new → contacted → hired → dismissed (optimistic) | |
| 4 | Rollback on failure | Previous status restored if update fails | |
| 5 | Sync button | Calls sync-leads; shows synced/new/updated counts | |
| 6 | Owner Operator fields | Truck year/make/model shown | |
| 7 | Plan gating | Free plan shows limited leads; upgrade prompt | |

### 5.9 Hired Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Shows hired applications | Filtered to pipeline_stage = "Hired" | |
| 2 | Read-only view | No edit actions available | |

### 5.10 Subscription Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Current plan shown | Free / Starter / Growth / Unlimited | |
| 2 | Lead usage | leadsUsed / leadLimit displayed | |
| 3 | Renewal date | currentPeriodEnd shown | |
| 4 | Status badge | active / past_due / canceled / trialing | |
| 5 | Upgrade link | Navigates to `/pricing` | |
| 6 | Manage/Cancel button | Calls create-portal-session → Stripe portal | |

### 5.11 AI Matches Tab (Company)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Matches load | From company_driver_match_scores | |
| 2 | Filter: by job | All jobs or specific active job | |
| 3 | Filter: source | All / application / lead | |
| 4 | Plan-gated limit | free=3, starter=25, growth=100, unlimited=9999 | |
| 5 | Match cards | Name, score badge, reasons, cautions, breakdown | |
| 6 | Score colors | ≥80 green, ≥60 blue, ≥40 amber, below red | |
| 7 | Empty state | When no matches or plan limit reached | |

---

## 6. Driver Dashboard (`/driver-dashboard`)

### 6.1 Auth & Navigation

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Non-driver user | Redirected to `/` with toast | |
| 2 | Tab state in URL | `?tab=overview` persists on refresh | |
| 3 | Deep link from notification | `?tab=messages&app=<id>` opens correct conversation | |

### 6.2 Overview Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Stats cards | Total Applications, Active, Interviews, Saved Jobs | |
| 2 | Recommended matches | Top 5 with score ≥ 30 shown as preview | |
| 3 | Link to AI matches tab | Works correctly | |

### 6.3 Applications Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | All driver applications load | From applications table | |
| 2 | Filter by stage | All / New / Reviewing / Interview / Hired / Rejected | |
| 3 | Expand/collapse cards | Company, job title, dates, stage badge shown | |
| 4 | Stage badge labels | "Hired", "Not Moving Forward" (Rejected), etc. | |
| 5 | Deep link `?app=<id>` | Auto-scrolls and expands target card | |

### 6.4 Saved Jobs Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Saved jobs load | From saved_jobs intersected with active jobs | |
| 2 | Remove (un-save) | Toast confirmation; job removed from list | |
| 3 | Click job | Navigates to `/jobs/:id` | |

### 6.5 Profile Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Load profile | Fields from driver_profiles | |
| 2 | Edit fields | firstName, lastName, phone, cdlNumber, driverType, licenseClass, yearsExp, licenseState, zipCode, dateOfBirth, about | |
| 3 | US States dropdown | All states listed | |
| 4 | Save | Supabase UPSERT; dirty-state detection; "Saved" badge | |
| 5 | Unsaved changes warning | Shown when navigating away with changes | |

### 6.6 Analytics Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Chart renders | Bar chart of applications over time | |
| 2 | Stage breakdown | Visual pipeline stage distribution | |

### 6.7 Messages Tab

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Conversations load | Shows company names as partners | |
| 2 | Send/receive messages | Same as company side | |
| 3 | Unread badge | Resets on open | |
| 4 | Deep link `?app=<id>` | Pre-selects conversation | |

### 6.8 AI Matches Tab (Driver)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Matches load | From driver_job_match_scores | |
| 2 | Sort: Best Fit | Default; by overall score desc | |
| 3 | Sort: Recent | By created_at desc | |
| 4 | Min score filter | All / 40+ / 60+ / 80+ | |
| 5 | Stats | New matches in 24h, missing info count, best match | |
| 6 | Match card content | Score, confidence, job details, reasons panel | |
| 7 | Feedback: Helpful | Saved to DB | |
| 8 | Feedback: Not Relevant | Saved to DB | |
| 9 | Feedback: Hide | Removes from list; excluded in future queries | |
| 10 | Save/unsave job | From match card | |
| 11 | Refresh Matches | Calls refresh-my-matches; toast "queued" | |
| 12 | Apply from match card | Links to `/jobs/:id` | |
| 13 | "Rules only" badge | Shows when semantic score unavailable | |
| 14 | Confidence badge | high / medium / low based on profile completeness | |

---

## 7. Admin Dashboard (`/admin`)

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Auth guard | Non-admin → redirect to `/` with toast | |
| 2 | Overview tab | Stat cards: users, companies, jobs, applications, subscriptions | |
| 3 | Users tab: search | By name or email | |
| 4 | Users tab: filter by role | All / driver / company | |
| 5 | Users tab: pagination | 15 per page | |
| 6 | Subscriptions tab | List with plan badges, status badges | |
| 7 | Change Plan dialog | Select new plan → confirm → subscription updated | |
| 8 | Jobs tab: status change | Dropdown (Draft/Active/Paused/Closed) → Supabase UPDATE | |
| 9 | Leads tab | Paginated leads list | |
| 10 | Matching tab: stats | driver_job_match_scores count, company scores count, queue pending/errors | |
| 11 | Queue errors table | Up to 10 most recent errors | |

---

## 8. AI Matching System

### 8.1 Scoring

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Complete driver profile | High confidence scores with reasons | |
| 2 | Empty driver profile | Degraded mode, "Rules only" badge, missing fields listed | |
| 3 | Score components | rulesScore + semanticScore + behaviorScore = overallScore | |
| 4 | Score colors | ≥80 green, ≥60 blue, ≥40 amber, <40 red | |

### 8.2 ApplyNow AI Flow

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Step 1: Personal Info | Required fields validate before next | |
| 2 | Step 2: Experience | Driver type, license class, years exp, license state required | |
| 3 | Step 3: Preferences | Multi-select chips work | |
| 4 | Progress bar | Updates step indicator correctly | |
| 5 | Back navigation | Preserves form state | |
| 6 | Pre-fill (signed-in driver) | From driver_profiles + auth email | |
| 7 | Guest sign-in gate | SignInModal appears; resumes form after sign-in | |
| 8 | Step 4: AI Generation | Animation plays; calls refresh-my-matches | |
| 9 | Step 5: Results Reveal | Matched jobs with scores shown | |
| 10 | "View All Matches" link | Navigates to driver dashboard AI matches tab | |

### 8.3 Recompute & Backfill

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | New job posted | Company's candidates requeued | |
| 2 | Driver profile updated | Driver's matches requeued | |
| 3 | Nightly backfill | All unscored pairs processed | |
| 4 | Queue depth in admin | Shows pending count correctly | |

---

## 9. Notifications System

### 9.1 Notification Types

| # | Type | Icon | Trigger |
|---|------|------|---------|
| 1 | `new_application` | FileText | Driver applies to company's job |
| 2 | `stage_change` | BarChart | Company moves driver's application |
| 3 | `new_message` | MessageSquare | Chat message received |
| 4 | `new_match` | Zap | New AI match computed |
| 5 | `new_lead` | Users | New lead synced |
| 6 | `subscription_event` | CreditCard | Plan change or billing event |
| 7 | `profile_reminder` | UserCircle | Incomplete profile |
| 8 | `weekly_digest` | BarChart | Scheduled weekly summary |
| 9 | `welcome` | PartyPopper | New user registration |

### 9.2 Notification Center UI

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Bell icon badge | Shows unread count (capped at "99+") | |
| 2 | Popover opens | Scrollable notification list | |
| 3 | Click notification | Marks as read + navigates to linked page | |
| 4 | Deep link params | Includes `?tab=` and `?app=` where applicable | |
| 5 | "Mark all as read" | Clears badge | |
| 6 | "Clear all" | Removes all notifications | |
| 7 | Polling | Notifications refresh every 15 seconds | |
| 8 | Unread count poll | Separate query every 15 seconds | |

### 9.3 Welcome Notification

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | New driver signs up | Welcome notification created with driver-specific message | |
| 2 | New company signs up | Welcome notification created with company-specific message | |
| 3 | Driver welcome link | Points to `/driver-dashboard?tab=profile` | |
| 4 | Company welcome link | Points to `/dashboard?tab=post-job` | |

### 9.4 Email Notifications

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Confirmation email | Uses branded confirmation.html template | |
| 2 | Password reset email | Uses branded recovery.html template | |
| 3 | Magic link email | Uses branded magic_link.html template | |
| 4 | Email change email | Uses branded email_change.html template | |
| 5 | Password changed email | Uses branded password_changed.html template with red CTA | |
| 6 | All emails branded | CDL Jobs Center header, consistent styling, footer with address | |

---

## 10. Chat / Messaging

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Conversations keyed on application_id | One conversation per application | |
| 2 | Company side: partner name | Shows driver's name | |
| 3 | Driver side: partner name | Shows company name | |
| 4 | Send with Enter | Message sent and appears immediately | |
| 5 | Shift+Enter | Inserts newline (does NOT send) | |
| 6 | Unread badge reset | Count → 0 when conversation opened | |
| 7 | markRead deduplication | Fires only once per unique (appId, unreadCount) | |
| 8 | Mobile layout | List → chat → back button | |
| 9 | Empty state | "No conversations yet" + role-appropriate hint | |
| 10 | Deep link `?app=<id>` | Pre-selects conversation on mount | |

---

## 11. Subscriptions & Stripe

### 11.1 Plans

| Plan | Leads | Price | Stripe Price ID |
|------|-------|-------|-----------------|
| Free | 3 | $0 | — |
| Starter | 25 | $49/mo | `price_1T5bgMBFInekdfRO2i7HVDfU` |
| Growth | 100 | $149/mo | `price_1T5bgmBFInekdfROyARtm9fx` |
| Unlimited | 9999 | $299/mo | `price_1T5bgyBFInekdfRO05OK8At6` |

### 11.2 Checkout Flow

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Company clicks Subscribe | create-checkout called with plan + auth token | |
| 2 | Stripe Checkout redirect | Browser redirected to Stripe | |
| 3 | Successful payment | stripe-webhook fires → subscription row created/updated | |
| 4 | Subscription visible | Dashboard shows new plan + lead limit | |

### 11.3 Cancellation Flow

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Click "Cancel/Manage" | create-portal-session → Stripe portal | |
| 2 | Cancel in portal | Webhook fires → DB updated to canceled | |
| 3 | After cancellation | Plan reverts; leads gated | |

### 11.4 Edge Cases

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Free plan: lead limit | Only 3 leads visible; upgrade prompt after | |
| 2 | Auto-create subscription row | Free row created on first dashboard load if missing | |
| 3 | Past due status | Badge shows "past_due" + warning | |

---

## 12. Leads System

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Leads load | From leads table filtered by company_id | |
| 2 | Auto-refresh | Every 60 seconds | |
| 3 | Status: new → contacted | Optimistic update works | |
| 4 | Status: contacted → hired | Optimistic update works | |
| 5 | Status: any → dismissed | Optimistic update works | |
| 6 | Rollback on failure | Previous status restored | |
| 7 | Sync button | Calls sync-leads; shows synced/new/updated counts | |
| 8 | Owner Operator fields | Truck year/make/model visible | |
| 9 | Lead cards | Phone, email, state, years exp | |
| 10 | Plan gating | Free plan limited; upgrade prompt | |

---

## 13. Navbar & Navigation

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Desktop nav links | Home, Jobs, Companies, Pricing (non-driver), Apply Now (non-company) | |
| 2 | "Pricing" hidden for drivers | Not shown when signed in as driver | |
| 3 | "Apply Now" hidden for companies | Not shown when signed in as company | |
| 4 | "Drivers" hidden from drivers | Not shown for driver role | |
| 5 | Apply Now (guest, on /apply) | Toast "Sign in or create an account to apply" | |
| 6 | Apply Now (guest, not on /apply) | Navigates to `/apply` | |
| 7 | Mobile hamburger menu | Opens/closes; all links work | |
| 8 | Mobile nav links | Same role-based filtering as desktop | |
| 9 | Notification bell | Shows for signed-in users | |
| 10 | Theme toggle (truck icon) | Switches light/dark mode | |
| 11 | Sign In / Sign Out button | Shows appropriate state | |
| 12 | Sign out confirmation modal | Shows on click; confirm signs out | |
| 13 | Dashboard link | Shows for company/driver when signed in | |

---

## 14. Dark Mode / Theme

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Toggle via truck icon | Switches light ↔ dark | |
| 2 | Persists on refresh | Stored in `cdl-theme` localStorage | |
| 3 | All pages render correctly | Both modes have proper contrast | |
| 4 | Match score badges | Correct colors in both modes | |
| 5 | Pipeline columns | Correct dark mode variants | |
| 6 | Status badges | Readable in both modes | |

---

## 15. Edge Functions

| # | Function | Test Case | Expected Result | Pass |
|---|----------|-----------|-----------------|------|
| 1 | `create-checkout` | Company with auth token | Returns Stripe Checkout URL | |
| 2 | `create-checkout` | No auth | 401 error | |
| 3 | `create-portal-session` | Company with subscription | Returns Stripe portal URL | |
| 4 | `create-portal-session` | No auth | 401 error | |
| 5 | `stripe-webhook` | checkout.session.completed | Subscription row created | |
| 6 | `stripe-webhook` | customer.subscription.deleted | Status → canceled | |
| 7 | `stripe-webhook` | invoice.paid | Status → active | |
| 8 | `match-recompute` | Process queue row | Match scores updated | |
| 9 | `match-backfill-nightly` | Cron trigger | All unscored pairs processed | |
| 10 | `refresh-my-matches` | Driver POST with auth | Queue row inserted; returns ok | |
| 11 | `refresh-my-matches` | Already pending | Returns ok with queued=false | |
| 12 | `refresh-my-matches` | Non-driver | 403 error | |
| 13 | `record-match-feedback` | helpful/not_relevant/hide | Feedback saved | |
| 14 | `send-notification` | Valid user + type | Notification row created | |
| 15 | `send-scheduled-notifications` | weekly_digest task | Digests sent to eligible users | |
| 16 | `send-scheduled-notifications` | profile_reminder task | Reminders sent to incomplete profiles | |
| 17 | `send-scheduled-notifications` | lead_quota task | Quota warnings sent | |
| 18 | `sync-leads` | Sync with sheets | Returns synced/new/updated/errors | |

---

## 16. Error & Edge Cases

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Network offline | Forms show timeout; queries show stale data | |
| 2 | PGRST116 (no rows) | Treated as empty/null for profiles (not error) | |
| 3 | ErrorBoundary | Uncaught errors render fallback UI | |
| 4 | Lazy loading failure (stale chunk) | Page auto-reloads once; renders on second attempt | |
| 5 | React Query retry | 1 retry; staleTime 30s; refetchOnWindowFocus false | |
| 6 | Duplicate application (same driver + job) | DB constraint rejects; user-friendly error toast shown | |
| 7 | Logo upload: invalid MIME type | Error toast "Please upload a PNG or JPG image"; file rejected | |
| 8 | Logo upload: oversized file | Error toast; previous logo preserved | |
| 9 | Empty states (all lists) | EmptyState component shown | |
| 10 | Pagination boundaries | Exactly divisible, 1 item, 0 items all handled | |
| 11 | URL deep links survive refresh | `?tab=`, `?app=`, `?type=`, `?freight=`, etc. | |
| 12 | Redirect routes | `/saved-jobs` → `/driver-dashboard`, `/my-applications` → `/driver-dashboard` | |
| 13 | Jobs page network error | Red error banner "Failed to load jobs. Please try again later." | |
| 14 | Invalid email format on registration | Toast "Please enter a valid email address" | |
| 15 | Password < 12 chars on registration | Toast "Password must be at least 12 characters" | |

---

## 17. Security & Headers

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | HSTS header | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` | |
| 2 | CSP header | `Content-Security-Policy` blocks inline scripts except 'unsafe-inline' for Vite; allows Stripe, Supabase, Google Fonts | |
| 3 | X-Frame-Options | `SAMEORIGIN` — prevents clickjacking | |
| 4 | X-Content-Type-Options | `nosniff` — prevents MIME sniffing | |
| 5 | Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(self)` | |
| 6 | Referrer-Policy | `strict-origin-when-cross-origin` | |
| 7 | Admin role escalation blocked | Registering with role="admin" in signUp metadata → DB trigger defaults to "driver" | |
| 8 | TypeScript blocks admin registration | `register()` type only accepts "driver" or "company" | |
| 9 | ProtectedRoute: unauthenticated → /signin | Guest accessing `/dashboard` or `/driver-dashboard` → redirect to `/signin` | |
| 10 | ProtectedRoute: wrong role → / | Driver accessing `/dashboard` → redirect to `/` | |
| 11 | API keys not in bundle | Stripe price IDs read from `import.meta.env.VITE_STRIPE_PRICE_*` | |

---

## 18. Nav & Auth Loading Behavior

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Fresh load (no cache) | Pulse skeleton placeholders shown during auth loading | |
| 2 | Driver refresh: "Find My Matches" persists | Cached role from localStorage prevents nav link flash | |
| 3 | Driver refresh: "Pricing" stays hidden | `effectiveRole` from cache hides Pricing during auth load | |
| 4 | Company refresh: "Drivers" link visible | Company-only links persist through refresh | |
| 5 | Sign out clears role cache | `cdl-cached-role` removed from localStorage on sign out | |
| 6 | Role cache cleared on no-session | If auth session expired, cached role is cleared | |

---

## 19. Notification Preferences

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Gear icon in NotificationCenter | Opens NotificationPreferences panel | |
| 2 | Toggle: in-app notifications | Enable/disable per notification type | |
| 3 | Toggle: email notifications | Enable/disable per notification type | |
| 4 | Preferences persist | Saved to Supabase; survive refresh | |
| 5 | New user defaults | All notification types enabled by default | |
| 6 | Back button returns to notifications | Returns to notification list from preferences | |

---

## 20. Responsive / Mobile

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Navbar | Hamburger menu on mobile; full links on desktop | |
| 2 | Jobs page | Cards stack vertically; filters collapse | |
| 3 | Dashboard tabs | Horizontal scroll or stacked on mobile | |
| 4 | Pipeline kanban | Horizontal scroll on mobile | |
| 5 | Chat panel | List → chat → back button flow on mobile | |
| 6 | Modals | Full-screen or properly sized on mobile | |
| 7 | Forms | All inputs accessible and sized for mobile | |
| 8 | Tables (admin) | Horizontal scroll on overflow | |

---

## 21. SEO & Meta

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Page titles | Each page has correct `<title>` | |
| 2 | Meta descriptions | Present on key pages | |
| 3 | Open Graph tags | og:title, og:description, og:image | |
| 4 | JSON-LD structured data | JobPosting schema on job pages | |
| 5 | robots.txt | Accessible at `/robots.txt` | |
| 6 | Sitemap | Accessible at `/sitemap.xml`; valid XML with all routes | |
| 7 | Canonical URLs | Correct canonical links | |

---

## 22. Performance & Polling

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Message polling interval | Refreshes every 15 seconds (not 5) | |
| 2 | Notification polling interval | Refreshes every 30 seconds | |
| 3 | Conversation list polling | Refreshes every 30 seconds | |
| 4 | Unread count polling | Refreshes every 30 seconds | |
| 5 | Query staleTime | Default 30s; messages 15s | |
| 6 | DnD optimistic update | cancelQueries fires before setQueryData | |
| 7 | Application History pagination | 20 per page; Next/Previous buttons work | |

---

## 23. Cross-Browser & Deployment

| # | Test Case | Expected Result | Pass |
|---|-----------|-----------------|------|
| 1 | Chrome (latest) | All features work | |
| 2 | Firefox (latest) | All features work | |
| 3 | Safari (latest) | All features work | |
| 4 | Edge (latest) | All features work | |
| 5 | Mobile Safari (iOS) | All features work | |
| 6 | Mobile Chrome (Android) | All features work | |
| 7 | Vercel deployment | Build succeeds; SPA routing works | |
| 8 | Stale chunk after deploy | Auto-reload recovers gracefully | |
| 9 | Asset caching | `/assets/*` cached immutable; `index.html` no-cache | |

---

## Summary

| Category | Count |
|----------|-------|
| Routes | 18 |
| Page Components | 16 |
| Modal/Dialog Components | 4 |
| Forms | 10 |
| Edge Functions | 10 |
| Dashboard Tabs (Company) | 10 |
| Dashboard Tabs (Driver) | 7 |
| Dashboard Tabs (Admin) | 6 |
| Notification Types | 9 |
| Auth Roles | 4 |
| Subscription Plans | 4 |
| Lead Status States | 4 |
| Pipeline Stages | 5 |
| Security & Headers | 11 |
| Nav & Auth Loading | 6 |
| Notification Preferences | 6 |
| Performance & Polling | 7 |
| Cross-Browser & Deployment | 9 |
| **Total Test Cases** | **~300+** |
