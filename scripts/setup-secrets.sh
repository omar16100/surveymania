#!/bin/bash
# Setup script for Cloudflare Workers secrets
# Adds required secrets for Clerk authentication

set -e

echo "🔐 Cloudflare Workers Secret Setup"
echo "===================================="
echo ""
echo "This script will add required secrets to your Cloudflare Workers environment."
echo "You'll need to provide the following values:"
echo ""
echo "  1. CLERK_SECRET_KEY - Your Clerk secret key (from Clerk Dashboard)"
echo "  2. CLERK_WEBHOOK_SECRET - Your Clerk webhook signing secret"
echo ""
echo "Note: DATABASE_URL is not needed as we use D1 binding directly"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

echo ""
echo "Adding CLERK_SECRET_KEY..."
echo "Enter your Clerk secret key (starts with sk_):"
wrangler secret put CLERK_SECRET_KEY

echo ""
echo "Adding CLERK_WEBHOOK_SECRET..."
echo "Enter your Clerk webhook secret (from Clerk Dashboard > Webhooks):"
wrangler secret put CLERK_WEBHOOK_SECRET

echo ""
echo "✅ All secrets configured successfully!"
echo ""
echo "To verify secrets are set, run:"
echo "  wrangler secret list"
