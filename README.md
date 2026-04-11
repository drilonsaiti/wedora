# Wedding Photos App

A production-ready wedding guest photo sharing web app built with Next.js 15, Supabase, TypeScript, and Tailwind CSS.

---

## Architecture

- **Next.js 15 App Router** — server components by default, client components only where interactivity is needed
- **Supabase** — Postgres (photos/events/admins tables), Auth (admin login), Storage (photos + thumbnails buckets), RLS (all enforced server-side)
- **Server Actions** — upload processing, admin CRUD, sign-out
- **Sharp** — server-side image optimisation + thumbnail generation
- **browser-image-compression** — client-side pre-compression before upload
- Public guests: upload-only access, zero read access to other photos
- Admins: full CRUD via authenticated server actions

---

## Folder Structure

```
wedding-photos/
├── app/
│   ├── layout.tsx              # Root layout (fonts, global CSS)
│   ├── globals.css             # Design tokens + utility classes
│   ├── page.tsx                # QR landing page
│   ├── upload/
│   │   ├── layout.tsx
│   │   └── page.tsx            # Upload page (server wrapper)
│   ├── success/
│   │   └── page.tsx            # Success screen
│   └── admin/
│       ├── layout.tsx
│       ├── page.tsx            # Redirects to /admin/photos
│       ├── login/
│       │   └── page.tsx        # Admin login
│       └── photos/
│           └── page.tsx        # Photo dashboard
├── components/
│   ├── upload-form.tsx         # Client upload form with compression
│   └── admin/
│       ├── login-form.tsx      # Client login form
│       └── dashboard.tsx       # Full photo management dashboard
├── actions/
│   ├── upload.ts               # Server action: process + store photo
│   └── admin.ts                # Server actions: CRUD, signed URLs, signout
├── lib/
│   ├── supabase/
│   │   ├── server.ts           # Server Supabase client + service client
│   │   └── client.ts           # Browser Supabase client
│   ├── compress.ts             # Client-side compression helpers
│   ├── sharp.ts                # Sharp processing (optimise + thumbnail)
│   └── utils.ts                # cn, formatBytes, sessionId, formatDate
├── schemas/
│   └── index.ts                # Zod schemas: upload, admin login, update
├── types/
│   └── database.ts             # Full TypeScript types matching DB
├── supabase/
│   └── schema.sql              # Full SQL schema + RLS + storage policies
├── middleware.ts                # Protects /admin/photos routes
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## Dependencies

```bash
npm install
```

Key packages:
- `next@15` `react@18` `typescript`
- `@supabase/ssr` `@supabase/supabase-js`
- `react-hook-form` `@hookform/resolvers` `zod`
- `browser-image-compression`
- `sharp`
- `lucide-react`
- `tailwindcss` `tailwindcss-animate`
- `clsx` `tailwind-merge`
- `uuid`

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_EVENT_ID=your-event-uuid   # UUID from events table

MAX_FILE_SIZE_MB=10
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it to the client.

---

## Supabase Setup

### 1. Create project at supabase.com

### 2. Run the SQL schema

Go to **SQL Editor** in your Supabase dashboard and run the full contents of `supabase/schema.sql`.

This creates:
- `events`, `photos`, `admins` tables
- `is_admin()` helper function
- All RLS policies
- Storage buckets (`photos`, `thumbnails`) with policies

### 3. Update the event UUID

In `schema.sql`, replace `'YOUR-EVENT-UUID-HERE'` with a real UUID (or let Postgres generate one with `uuid_generate_v4()`), then copy it to `NEXT_PUBLIC_EVENT_ID` in your `.env.local`.

### 4. Create the first admin user

In **Supabase Dashboard → Authentication → Users**, create a user with email + password.

Then in SQL Editor:
```sql
insert into public.admins (id, email)
values ('USER-UUID-FROM-AUTH', 'admin@yourdomain.com');
```

---

## RLS & Security Summary

| Action | Who |
|--------|-----|
| Upload photo | Anyone (anonymous) |
| Read photos | Admins only |
| Update photo (approve/hide/favourite) | Admins only |
| Delete photo | Admins only |
| List all photos | Admins only |
| Upload to `photos` bucket | Anyone |
| Read from `photos` bucket | Admins only |
| Read from `thumbnails` bucket | Admins only |

Guests can **only** write. They can never list or read other guests' photos. The service role key is used exclusively in server actions — never sent to the browser.

---

## Storage Bucket Structure

```
photos/
└── {event_id}/
    └── {photo_id}/
        └── original.webp       # Sharp-optimised, max 2048px

thumbnails/
└── {event_id}/
    └── {photo_id}/
        └── thumbnail.webp      # 400×400 cover crop
```

Both buckets are **private**. Admins access via signed URLs (1-hour expiry) generated server-side.

---

## Upload Flow

1. Guest opens QR link → `/`
2. Taps "Share a Photo" → `/upload`
3. Chooses camera or gallery
4. Optional: adds name + message
5. Client compresses image (max 3MB, max 2048px) using `browser-image-compression`
6. Client validates: type (JPEG/PNG/WebP/HEIC) + size
7. `uploadPhotoAction` (server action):
   - Validates metadata with Zod
   - Rate-limits: max 20 uploads per session
   - Processes with Sharp: optimised WebP + 400×400 thumbnail
   - Uploads both to Supabase Storage
   - Inserts record into `photos` table
8. Redirect to `/success`

---

## Local Development

```bash
npm install
cp .env.example .env.local
# fill in .env.local

npm run dev
```

App runs at `http://localhost:3000`

---

## Deployment (Vercel + Supabase)

### Vercel

1. Push to GitHub
2. Import repo at vercel.com
3. Set all environment variables from `.env.local`
4. Deploy

Vercel handles Next.js App Router and server actions automatically.

> Sharp requires Node.js runtime. In `next.config.js`, ensure no edge runtime is set for routes that use Sharp. The default Node.js runtime in App Router server actions is correct.

### Custom domain

In Vercel → Settings → Domains, add your domain.

Update `NEXT_PUBLIC_APP_URL` to your production domain.

---

## QR Code

1. Deploy the app and get the production URL (e.g. `https://your-domain.com`)
2. Generate a QR code pointing to `https://your-domain.com/upload` (or `/`)
3. Use any QR generator: [qr-code-generator.com](https://www.qr-code-generator.com), or programmatically with a library like `qrcode`
4. Print and display at the venue — table cards, ceremony programs, welcome sign

Recommended QR code size: at least 5×5cm printed, with a quiet zone border.

---

## Admin Usage

- URL: `https://your-domain.com/admin/login`
- Login with the admin email + password set in Supabase Auth
- Dashboard features:
  - Filter: All / Favourites / Hidden / Unapproved
  - Per-photo: Favourite ♥ / Hide / Approve / Download / Delete
  - Full-size modal with navigation arrows
  - Guest name + message displayed
  - Photo metadata (dimensions, file size, upload time)

---

## Future Improvements

- Email notification to couple when a new photo is uploaded
- ZIP download of all photos (server-side streaming archive)
- Photo slideshow / gallery view for the couple to share
- Moderation queue: hold photos for approval before they're "live"
- Magic link / passwordless admin login
- Multiple events support with per-event QR codes
- Watermarking with couple's names + date on download
- HEIC → WebP conversion edge case hardening for older iOS devices
