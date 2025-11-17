import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Get Prisma client for Cloudflare Workers D1
 * Must be called per-request in edge runtime
 *
 * @param d1 D1Database binding from Cloudflare Workers
 * @returns Configured PrismaClient instance
 */
export function getPrismaClient(d1: D1Database): PrismaClient {
  const adapter = new PrismaD1(d1);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : []
  });
}

/**
 * Get database client for current request
 * Automatically retrieves D1 binding from OpenNext Cloudflare context
 *
 * @throws Error if D1 binding not found
 * @returns Configured PrismaClient instance
 */
export function getDB(): PrismaClient {
  // Get D1 binding from OpenNext Cloudflare context (async mode for top-level calls)
  const { env } = getCloudflareContext({ async: true });
  const DB = env.DB as D1Database;

  if (!DB) {
    throw new Error('D1 database binding not found. Ensure wrangler.toml has [[d1_databases]] binding configured.');
  }

  return getPrismaClient(DB);
}

