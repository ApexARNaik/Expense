# Flat Expense Tracker

A fast, private, and simple expense tracking application built for flatmates. It features a name-only login system, automatic share calculation with exactly balanced splits, interactive dashboards for tracking paid versus owed amounts (including deterministic exact settlement hints), and robust receipt image processing.

## Tech Stack
- **Framework:** [Next.js](https://nextjs.org/) (App Router, Server Actions, API Routes)
- **Database:** [Prisma](https://www.prisma.io/) (SQLite by default, easily switchable to PostgreSQL)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Image Processing:** [Sharp](https://sharp.pixelplumbing.com/) (Server-side WebP conversion, EXIF stripping)

## Environment Variables
Create a `.env` file in the root directory (use `.env.example` as a template):
```env
# Required: Minimum 32-character secret for signing session cookies
SESSION_SECRET="your_very_long_secure_random_string_here_12345"

# Recommended: A shared passphrase required during login to prevent unauthorized access
HOUSE_PASSPHRASE="your_shared_passphrase"

# Required: Connection string for your database
DATABASE_URL="file:./dev.db"
```

## How to Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize the database:**
   ```bash
   npx prisma db push
   ```

3. **Seed the database (creates members):**
   ```bash
   npm run seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

## Running Tests
Tests are designed to run against a separate database (`test.db`) to ensure your `dev.db` is not modified. 
Run the integrated test suite with:
```bash
node tests/run.js
```
*(Note: Ensure your local dev server on port 3000 is stopped before running the test suite, as it spins up its own Next.js instance on port 3001.)*

## Running the Orphan Cleanup Script
When receipt images are replaced or soft-deleted, unused images may remain in the `uploads/` directory. You can run the cleanup script to permanently delete images that have been orphaned for more than 24 hours:
```bash
node scripts/cleanup-orphans.js
```

## Switching from SQLite to PostgreSQL
The app uses SQLite by default for easy local development. To deploy to production with PostgreSQL:
1. Open `prisma/schema.prisma`.
2. Change the provider from `"sqlite"` to `"postgresql"`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Update your `.env` to point `DATABASE_URL` to your Postgres instance (e.g., `postgresql://user:password@localhost:5432/mydb`).
4. Generate the new client and run migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
*(Note: Depending on your schema history, you might want to use `npx prisma migrate dev` instead of `db push` for production).*

## Security Notes
- **Authentication:** By design, this application uses a simple "name-only" login system without individual passwords.
- **House Passphrase:** Because login is name-only, it is **highly recommended** to set the `HOUSE_PASSPHRASE` environment variable if you are deploying the application publicly. This acts as a master password for all flatmates.
- **Data Protection:** All APIs and Server Actions strictly enforce session presence. Receipt images (EXIF metadata and GPS stripped) are served through authenticated endpoints (`/api/images/[key]`) ensuring they are not publicly accessible.
