#!/bin/bash
# D1 Migration Script for Cloudflare Workers
# Generates and applies database migrations from Prisma schema

set -e

MIGRATION_NAME="${1:-schema_update}"
DB_NAME="surveymania-prod"
REMOTE="${2:-false}"

echo "🔄 Generating D1 migration from Prisma schema..."

# Create migration file using wrangler
wrangler d1 migrations create "$DB_NAME" "$MIGRATION_NAME"

# Find the most recent migration file
LATEST_MIGRATION=$(ls -t migrations/*.sql 2>/dev/null | head -n 1)

if [ -z "$LATEST_MIGRATION" ]; then
  echo "❌ Error: No migration file created"
  exit 1
fi

echo "📝 Migration file created: $LATEST_MIGRATION"

# Generate SQL diff from Prisma schema
echo "🔍 Generating SQL from Prisma schema..."
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > "$LATEST_MIGRATION"

echo "✅ SQL generated and written to $LATEST_MIGRATION"

# Show the migration content
echo ""
echo "📋 Migration SQL:"
cat "$LATEST_MIGRATION"
echo ""

# Apply migration
if [ "$REMOTE" = "true" ] || [ "$REMOTE" = "--remote" ]; then
  echo "🚀 Applying migration to remote D1 database..."
  wrangler d1 migrations apply "$DB_NAME" --remote
else
  echo "💻 Applying migration to local D1 database..."
  wrangler d1 migrations apply "$DB_NAME" --local
fi

echo "✅ Migration applied successfully!"
