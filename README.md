# VitaStore Inventory Manager

A simple, reliable, single-user web application for real-time inventory management and transaction tracking.

## Overview (Next.js + Supabase)

This project is a monolithic Next.js application that connects directly to Supabase for database and authentication. No separate backend server is required.

## Prerequisites

- Node.js (v18 or higher)
- Supabase project (with anon key)

## Setup

1) Install dependencies
```bash
npm install
```

2) Environment variables (create `.env.local` in the root directory)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3) Supabase schema (run in Supabase SQL editor)
```sql
-- Items
create table if not exists items (
  id bigserial primary key,
  name text not null,
  sku text unique not null,
  unit text default 'pcs',
  quantity integer not null default 0,
  min_stock integer not null default 0,
  price numeric(10,2) default 0,
  category text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Transactions
create table if not exists transactions (
  id bigserial primary key,
  item_id bigint references items(id) on delete cascade,
  type text check (type in ('IN','OUT')) not null,
  quantity integer not null,
  notes text,
  created_at timestamp with time zone default now()
);

-- Helpful index
create index if not exists idx_transactions_item_id on transactions(item_id);
```

4) Enable Row Level Security (RLS) policies in Supabase:
   - Go to Authentication > Policies
   - Create policies to allow authenticated users to read/write items and transactions

5) Auth
   - Create a Supabase email/password user in the Supabase Auth dashboard
   - Use this email/password to log in to the application

## Running

```bash
npm run dev   # runs Next.js development server
```

App: http://localhost:3000

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
vitaStore/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Dashboard page
│   ├── login/
│   │   └── page.tsx        # Login page
│   └── globals.css         # Global styles
├── components/
│   ├── Dashboard.tsx       # Main dashboard component
│   ├── ItemModal.tsx       # Add/Edit item modal
│   └── TransactionModal.tsx # Stock transaction modal
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── api.ts              # API functions
└── package.json
```

## Notes

- All CRUD operations and dashboard queries use Supabase directly from the client
- Authentication is handled by Supabase Auth
- The application uses the "Alchemy of Systems" Renaissance-inspired design with Three.js particle effects

## License

ISC

# vitaStore
# vitaStore
