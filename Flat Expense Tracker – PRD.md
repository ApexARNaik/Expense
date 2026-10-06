# Flat Expense Tracker: Product Requirements Document

**Version:** 1.0 (Draft) | **Date:** 5 Oct 2026 | **Users:** Atul, Affaan, Lalith | **Currency:** INR (₹)

## 1. Overview

A small, private web app for three flatmates to log shared apartment expenses, attach a receipt photo, choose who the expense applies to, and instantly see how much each person's share adds up to. There is no signup and no password: the user picks their name from three seeded members and enters.

### 1.1 Problem

Shared costs (rent extras, groceries, internet, gas, cleaning supplies, furniture) are tracked in chat messages or memory. Some expenses are for everyone, some for two people, and some for only one person. Nobody has a single, trustworthy view of who owes what.

### 1.2 Goals

- Log an expense in under 20 seconds.
- Let each expense be assigned to all three flatmates, any two, or just one.
- Show each person's individual total cost clearly, always up to date.
- Keep access friction near zero: tap a name, you are in.
- Keep a receipt image with the expense as proof.

### 1.3 Non-Goals (v1)

- No signup, registration, password reset, or user management.
- No support for more than the three seeded members.
- No payment processing, UPI integration, or bank sync.
- No multi-currency, no multiple flats or groups.
- No native mobile app (the web app must be mobile-friendly instead).

## 2. Users and Personas

All three users have equal permissions. There are no admin or guest roles.

| Member | Role | Notes |
| --- | --- | --- |
| Atul | Flatmate | Seeded user |
| Affaan | Flatmate | Seeded user |
| Lalith | Flatmate | Seeded user |

**Primary usage context:** mostly on phones, right after buying something, often with a receipt in hand.

## 3. Key Concepts

- **Expense:** a single spend with an amount, title, date, optional image, a payer, and a list of participants.
- **Participants (the "split" selection):** the flatmates the expense is for. The amount is divided equally among them.
- **Share:** the portion of an expense that one participant owes.
- **Person total:** the sum of all of a person's shares across expenses, which is the figure displayed per person.

### 3.1 Split Options

When adding an expense the user chooses who it applies to using one control with three modes:

| Option | Participants | Example |
| --- | --- | --- |
| **Everyone** | Atul, Affaan, Lalith | Wi-Fi bill ₹900 gives ₹300 each |
| **Some** (pick any 2) | Two selected people | Dinner for two ₹600 gives ₹300 each |
| **Only one** | One selected person | Personal item ₹450 gives ₹450 to that person |

Implementation note: this can be a single row of three toggle chips (Atul / Affaan / Lalith) plus an **All** shortcut chip. At least one person must be selected. Selecting all three is equivalent to "Everyone".

## 4. User Stories

1. As a flatmate, I can open the site and log in by selecting my name, so I can get in without a password.
2. As a flatmate, I can add an expense with title, amount, date, and category so the group has a record.
3. As a flatmate, I can mark who the expense is for (all, any two, or just one) so costs are assigned fairly.
4. As a flatmate, I can upload a photo of the receipt so there is proof.
5. As a flatmate, I can see each person's total cost on the home screen so everyone knows their share.
6. As a flatmate, I can see the list of all expenses with who paid and who it was split with.
7. As a flatmate, I can edit or delete an expense I added if I made a mistake.
8. As a flatmate, I can filter by month so I can review a billing period.
9. As a flatmate, I can log out and let another person log in on the same device.

## 5. Functional Requirements

Priority key: **P0** = must have for launch, **P1** = should have, **P2** = nice to have.

### 5.1 Authentication (Name-Only Login)

| ID | Requirement | Priority |
| --- | --- | --- |
| AUTH-1 | The login screen shows exactly three buttons: Atul, Affaan, Lalith. | P0 |
| AUTH-2 | Tapping a name creates a session for that member and opens the dashboard. No password or typing needed. | P0 |
| AUTH-3 | Only the three seeded members can log in. There is no signup page or route. | P0 |
| AUTH-4 | The session persists on that device (cookie, about 30 days) so the user is not asked again. | P0 |
| AUTH-5 | A visible **Switch user / Log out** option is available in the header. | P0 |
| AUTH-6 | Every API call validates the session and rejects unknown members. | P0 |
| AUTH-7 | Optional: a single shared house passphrase gate in front of the name picker (see Security, section 9). | P1 |

### 5.2 Add Expense

Fields:

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| Title | Text, max 80 chars | Yes | e.g. "Groceries", "Gas cylinder" |
| Amount | Number (₹) | Yes | Greater than 0, max 2 decimals, upper cap of ₹10,00,000 |
| Date | Date | Yes | Defaults to today; future dates allowed up to 7 days ahead warning only |
| Paid by | Select (3 members) | Yes | Defaults to the logged-in user |
| Split between | Chips (Atul, Affaan, Lalith, All) | Yes | At least one selected; defaults to All |
| Category | Select | No | Rent, Utilities, Groceries, Food and Dining, Household, Internet, Furniture, Other |
| Note | Text, max 300 chars | No | Free text |
| Receipt image | File upload | No | JPG, PNG, WebP, HEIC; max 10 MB before compression |

Requirements:

- **EXP-1 (P0):** Form validates required fields inline and blocks submit until valid.
- **EXP-2 (P0):** Show a live preview of the per-person share (for example "₹300.00 each") as the amount and selection change.
- **EXP-3 (P0):** Rounding: amounts are stored in paise (integers). When an amount does not divide evenly, the leftover paise go to the participants in a stable order (first participants alphabetically get 1 paisa extra). The shares must always sum exactly to the total.
- **EXP-4 (P0):** Image upload from camera or gallery on mobile, with a thumbnail preview and a remove option before saving.
- **EXP-5 (P0):** Images are resized client-side to a max of about 1600 px on the long edge and compressed to keep storage small.
- **EXP-6 (P1):** Quick add: after saving, offer "Add another".
- **EXP-7 (P2):** Remember the last used split selection per user.

### 5.3 Dashboard and Per-Person Cost

The dashboard is the home screen and the heart of the product.

- **DASH-1 (P0):** Three cards, one per flatmate, each showing that person's **total cost** (sum of their shares) for the selected period.
- **DASH-2 (P0):** A **Total house spend** figure for the period.
- **DASH-3 (P0):** Period selector: This month (default), Last month, All time, and a month picker.
- **DASH-4 (P0):** Each person card can be tapped to show a breakdown: shared-with-everyone portion, shared-with-some portion, and personal-only portion.
- **DASH-5 (P1):** **Paid vs owed:** each card also shows how much that person actually paid, and the net balance (who should receive money, who should pay).
- **DASH-6 (P1):** Simple settlement hint, for example "Lalith pays Atul ₹1,240", computed using the minimum number of transfers.
- **DASH-7 (P2):** A small category breakdown chart for the period.

**Calculation rule:**

> For each expense, share per participant = amount ÷ number of participants (with paise rounding per EXP-3). A person's total = sum of their shares across all expenses in the period. Expenses where the person is not selected contribute nothing to their total.

**Worked example:**

| Expense | Amount | Split between | Atul | Affaan | Lalith |
| --- | --- | --- | --- | --- | --- |
| Wi-Fi | ₹900 | Everyone | 300 | 300 | 300 |
| Dinner | ₹600 | Atul, Affaan | 300 | 300 | 0 |
| Razor | ₹450 | Lalith only | 0 | 0 | 450 |
| **Totals** | **₹1,950** |  | **600** | **600** | **750** |

### 5.4 Expense List and Detail

- **LIST-1 (P0):** Reverse-chronological list showing title, amount, date, paid by, and small avatars or initials for the people it is split with.
- **LIST-2 (P0):** Tapping an expense opens a detail view with the full receipt image (zoomable), per-person shares, note, category, and who added it and when.
- **LIST-3 (P0):** Edit and Delete actions on the detail view, with a delete confirmation.
- **LIST-4 (P1):** Filters: by person involved, by payer, by category, and a title search.
- **LIST-5 (P1):** An edit history stamp ("Edited by Affaan on 3 Oct"). Deletes are soft deletes so data can be recovered.
- **LIST-6 (P2):** CSV export of the period's expenses.

### 5.5 Permissions

- All three members can view all expenses.
- Any member can edit or delete any expense (it is a trust-based household), but every change records who made it. Open question OQ-3 asks whether to restrict edits to the creator.

## 6. UX and Screens

| Screen | Purpose | Key elements |
| --- | --- | --- |
| Login | Pick identity | Three large name buttons, app title |
| Dashboard | See per-person totals | Period selector, 3 person cards, total spend, recent expenses, floating **+ Add** button |
| Add / Edit Expense | Record a spend | Form from section 5.2, share preview, image picker |
| Expense List | Browse history | Filters, list rows |
| Expense Detail | Inspect one expense | Receipt image, shares table, edit and delete |

**Design principles:**

- Mobile first: large tap targets, bottom-anchored primary action, number keypad for amount.
- Clean and calm; use a distinct color or avatar initial for each flatmate so they are recognizable at a glance.
- Light and dark theme following system setting (P2).
- Empty states with a friendly prompt ("No expenses yet, add the first one").

## 7. Data Model

**members** (seeded, fixed)

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID / int | Primary key |
| name | text, unique | Atul, Affaan, Lalith |
| color | text | UI accent |

**expenses**

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| title | text | Required |
| amount\_paise | integer | Stored in paise to avoid float errors |
| expense\_date | date |  |
| paid\_by | FK to members |  |
| category | text | Nullable |
| note | text | Nullable |
| image\_url | text | Nullable |
| created\_by | FK to members |  |
| created\_at / updated\_at | timestamp |  |
| updated\_by | FK to members | Nullable |
| deleted\_at | timestamp | Nullable, soft delete |

**expense\_shares** (one row per participant per expense)

| Field | Type | Notes |
| --- | --- | --- |
| expense\_id | FK to expenses | Composite key part |
| member\_id | FK to members | Composite key part |
| share\_paise | integer | Pre-computed with rounding rule |

Storing computed shares makes per-person totals a simple `SUM(share_paise)` grouped by member, and keeps history stable if the rule ever changes. A database check should enforce that the shares of an expense sum to `amount_paise`.

**Seed data:** three members inserted by a migration or seed script on first deploy.

## 8. API Outline

| Method and path | Description |
| --- | --- |
| `POST /api/login` | Body: member name. Sets session cookie. Rejects unknown names. |
| `POST /api/logout` | Clears session. |
| `GET /api/me` | Current member. |
| `GET /api/summary?from=&to=` | Per-person totals, paid amounts, net balances, and total spend. |
| `GET /api/expenses?from=&to=&member=&payer=&category=&q=` | List with filters. |
| `POST /api/expenses` | Create expense with participants and optional image. |
| `GET /api/expenses/:id` | Detail with shares. |
| `PUT /api/expenses/:id` | Update expense and recompute shares. |
| `DELETE /api/expenses/:id` | Soft delete. |
| `POST /api/uploads` | Upload a receipt image, returns URL. |

## 9. Security, Privacy, and Risks

Because the app has no password, **anyone who can open the URL can pick any name and read or change data.** This is acceptable only because it is a tiny private household tool, but it must be a conscious decision.

Mitigations:

- **Use an unguessable URL and do not publish or index it** (add `noindex` meta and a `robots.txt` disallow).
- **P1 shared house passphrase:** one passphrase typed once per device, before the name picker. Still no per-user passwords or signup.
- Optional network restriction (for example hosting behind a private link or allow-listing) if the group wants more safety.
- HTTPS only; secure, HttpOnly, SameSite session cookie.
- Receipt images stored in private storage and served through short-lived signed URLs rather than public links.
- Strip EXIF location data from uploaded images.
- Rate-limit login and upload endpoints.
- Server-side validation on all inputs; never trust the client's computed shares.

## 10. Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Performance | Dashboard loads in under 2 seconds on a typical 4G connection; add expense saves in under 1 second excluding image upload. |
| Responsiveness | Fully usable from 360 px wide phones to desktop. |
| Accuracy | Totals computed in integer paise; zero tolerance for rounding drift. |
| Reliability | Daily automated database backup; images backed up with the storage provider. |
| Capacity | Designed for around 3 users and a few thousand expenses; no scaling work needed. |
| Accessibility | Sufficient contrast, labelled inputs, keyboard-navigable. |
| Browser support | Latest Chrome, Safari, Edge, Firefox. |
| Cost | Run on free or near-free hosting tiers. |

## 11. Recommended Tech Stack

The stack is a suggestion; any equivalent choice works.

- **Frontend and backend:** Next.js (React) with TypeScript, Tailwind CSS.
- **Database:** PostgreSQL via Supabase or Neon (or SQLite with Turso for the simplest setup).
- **Image storage:** Supabase Storage or Cloudflare R2 with signed URLs.
- **Session:** signed cookie (for example iron-session or NextAuth credentials-less custom session).
- **Hosting:** Vercel (app) plus the managed database.
- **Validation:** Zod for shared client and server schemas.

## 12. Edge Cases

- No participant selected: block submit with a clear message.
- Amount that does not divide evenly (for example ₹100 among 3): shares are 33.34, 33.33, 33.33 and always sum to 100.00.
- Editing an expense after changing the split: shares are recomputed and totals update immediately.
- Deleting an expense: totals update immediately; soft-deleted rows are excluded.
- Very large or corrupt image, or unsupported file type: show an error, do not lose the rest of the form.
- Slow or offline connection while saving: show a retry option and avoid duplicate submissions (disable button, idempotency key).
- Two people editing the same expense: last write wins, with the updated-by stamp visible.
- Expense dated in a past month: it correctly lands in that month's totals.
- Paid-by person not included in the split (for example Atul paid for Lalith's item): fully supported, and it shows up in net balances.

## 13. Acceptance Criteria (Launch Checklist)

1. Only Atul, Affaan, and Lalith can log in, by tapping a name with no password; no signup route exists.
2. An expense can be created for Everyone, any two people, or one person, and only the selected people are charged.
3. A receipt image can be uploaded from a phone, viewed on the detail page, and replaced or removed on edit.
4. The dashboard shows each person's individual total, and the three totals reconcile exactly with the sum of all expense shares.
5. The worked example in section 5.3 produces 600 / 600 / 750.
6. Editing or deleting an expense updates all totals immediately.
7. The app is fully usable on a 360 px wide phone screen.
8. Images and data are not publicly accessible without the app session.

## 14. Milestones

| Phase | Scope | Estimate |
| --- | --- | --- |
| 1. Foundation | Project setup, DB schema, seed members, name-only login and session | 1 day |
| 2. Core expenses | Add, edit, delete, split selection, share calculation, list and detail | 2 days |
| 3. Dashboard | Per-person totals, period filter, breakdown | 1 day |
| 4. Images | Upload, compression, private storage, viewer | 1 day |
| 5. Polish and deploy | Responsive QA, empty states, backups, deploy | 1 day |
| 6. P1 follow-ups | Paid vs owed, settlement hint, filters, passphrase gate | 1 to 2 days |

## 15. Success Metrics

- All three flatmates use the app for at least 4 consecutive weeks.
- Over 90% of shared expenses are logged within 2 days of being spent.
- Month-end settlement requires no manual recalculation or disputes.

## 16. Open Questions

- **OQ-1:** Do you want paid-by tracking and settlement (who owes whom), or only each person's share of cost? The PRD includes it as P1 because "cost of each person" is most useful alongside what each person already paid.
- **OQ-2:** Is an equal split always enough, or will you ever need custom amounts or percentages per person?
- **OQ-3:** Should anyone be able to edit or delete any expense, or only the person who added it?
- **OQ-4:** Is a shared house passphrase acceptable, given that name-only login is open to anyone with the link?
- **OQ-5:** Do you want a "mark as settled" action to reset balances at month end?
- **OQ-6:** Should recurring expenses (monthly Wi-Fi, maid, rent extras) be auto-created?

## 17. Future Enhancements

Recurring expenses, settlement history, push or WhatsApp reminders, OCR to auto-read receipt totals, monthly PDF or CSV statements, and installable PWA support.
