# Database Setup Guide

> **⚠️ DEPRECATED**: This guide is for the legacy PostgreSQL setup.
>
> **The project now uses Cloudflare D1 (SQLite) for production deployment.**
>
> See [cloudflare-deployment.md](./cloudflare-deployment.md) for current deployment guide.
>
> This file is kept for reference only.

---

## Prerequisites

You need PostgreSQL installed with PostGIS extension for geospatial features.

### Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew install postgis
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib postgis
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL.org](https://www.postgresql.org/download/windows/)

### Install PostGIS Extension

```sql
-- Connect to your database first
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Setup Steps

### 1. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE surveymania;

# Connect to the database
\c surveymania

# Enable PostGIS extension
CREATE EXTENSION postgis;

# Exit psql
\q
```

### 2. Configure Environment

Update the `.env` file with your database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/surveymania?schema=public"
```

Replace:
- `username` - your PostgreSQL username (default: your system username)
- `password` - your PostgreSQL password (or remove if none)
- `localhost` - database host
- `5432` - PostgreSQL port (default)

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Migrations

This creates all the tables defined in `prisma/schema.prisma`:

```bash
npm run prisma:migrate
```

You'll be prompted to name the migration. Suggestion: `init`

### 5. Seed the Database

This populates the database with sample data for testing:

```bash
npm run prisma:seed
```

**What gets created:**
- 1 dev user (`dev@surveymania.com`)
- 1 organization ("Development Organization")
- 1 active survey ("Customer Satisfaction Survey") with 5 questions
- 5 sample responses with answers and location data

### 6. Verify Setup

```bash
# Open Prisma Studio to browse data
npm run prisma:studio
```

This opens a browser interface at `http://localhost:5555` where you can:
- View all tables
- Browse records
- Edit data
- Test queries

## Quick Setup (One Command)

```bash
# After creating the database and updating .env
npm run db:setup
```

This runs both migration and seed in one command.

## Troubleshooting

### Connection Refused

**Problem:** Can't connect to PostgreSQL

**Solutions:**
- Check if PostgreSQL is running: `brew services list` (macOS) or `systemctl status postgresql` (Linux)
- Verify port 5432 is not in use: `lsof -i :5432`
- Check credentials in `.env`

### PostGIS Not Found

**Problem:** `ERROR: could not open extension control file ... postgis`

**Solution:**
```bash
# macOS
brew install postgis

# Then in psql:
CREATE EXTENSION postgis;
```

### Migration Fails

**Problem:** Migration errors

**Solutions:**
1. Drop and recreate database:
   ```sql
   DROP DATABASE surveymania;
   CREATE DATABASE surveymania;
   ```
2. Reset migrations:
   ```bash
   rm -rf prisma/migrations
   npm run prisma:migrate
   ```

### Seed Fails

**Problem:** Unique constraint violations

**Solution:**
```bash
# Reset database
npx prisma migrate reset

# This will:
# 1. Drop the database
# 2. Create it again
# 3. Run all migrations
# 4. Run the seed script
```

## Database Schema Overview

### Core Tables

- **User** - User accounts (Clerk integration)
- **Organization** - Multi-tenant organizations
- **Survey** - Survey definitions
- **SurveyQuestion** - Questions within surveys
- **SurveyResponse** - User responses to surveys
- **SurveyAnswer** - Individual answers to questions
- **Campaign** - Survey collection campaigns
- **CampaignMember** - Team members in campaigns
- **Export** - Export job records

### Key Features

- **Geospatial Data**: `latitude`, `longitude` with PostGIS support
- **JSON Fields**: Flexible settings, metadata, and options
- **Enums**: Type-safe status and type fields
- **Relations**: Proper foreign keys and cascade rules
- **Indexes**: Optimized for common queries

## Sample Data Details

### Survey Questions

1. **Text**: "What is your name?"
2. **Single Choice**: "How satisfied are you with our service?"
   - Options: Very Satisfied, Satisfied, Neutral, Dissatisfied, Very Dissatisfied
3. **Multiple Choice**: "Which features do you use most?"
   - Options: Dashboard, Reports, Analytics, Exports, API Access
4. **Textarea**: "What can we do to improve?"
5. **Number (NPS)**: "How likely are you to recommend us? (0-10)"

### Sample Responses

5 responses with realistic data:
- Names, satisfaction levels, feature usage
- NPS scores ranging from 4-10
- Location coordinates (Singapore area)
- Detailed feedback text

## Next Steps

After setup:

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Test the application:**
   - Create a survey: http://localhost:3000/dashboard/surveys/new
   - View responses: http://localhost:3000/dashboard/surveys/[id]/responses
   - Export CSV: Click "Export CSV" button

3. **View sample data:**
   - Navigate to: http://localhost:3000/dashboard/surveys
   - You should see "Customer Satisfaction Survey"
   - View its 5 sample responses

## Production Setup

For production:

1. Use a managed PostgreSQL service:
   - **Supabase** (recommended for PostGIS)
   - **Railway**
   - **AWS RDS**
   - **Heroku Postgres**

2. Enable connection pooling (PgBouncer)

3. Set up automated backups

4. Use read replicas for high traffic

5. Monitor slow queries

## Database Maintenance

### Backup

```bash
pg_dump surveymania > backup.sql
```

### Restore

```bash
psql surveymania < backup.sql
```

### Reset Development Database

```bash
npx prisma migrate reset
```

### View Generated SQL

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

## Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [PostGIS Documentation](https://postgis.net/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
