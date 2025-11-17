import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { getDB } from '@/lib/db'
import { WebhookEvent } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

/**
 * Clerk webhook endpoint for user synchronization
 * Handles user.created, user.updated, user.deleted events
 *
 * @see https://clerk.com/docs/webhooks/overview
 */
export async function POST(req: NextRequest) {
  const prisma = getDB()

  try {
    // 1. Verify webhook signature
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
    if (!WEBHOOK_SECRET) {
      console.error('[Webhook] CLERK_WEBHOOK_SECRET not configured')
      throw new Error('CLERK_WEBHOOK_SECRET not configured')
    }

    const headersList = headers()
    const svix_id = headersList.get('svix-id')
    const svix_timestamp = headersList.get('svix-timestamp')
    const svix_signature = headersList.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('[Webhook] Missing svix headers')
      return NextResponse.json(
        { error: 'Missing svix headers' },
        { status: 400 }
      )
    }

    const body = await req.text()
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: WebhookEvent
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature
      }) as WebhookEvent
    } catch (err) {
      console.error('[Webhook] Verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log('[Webhook] Received event:', evt.type, 'for user:', evt.data.id)

    // 2. Handle events
    const eventType = evt.type

    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        // Upsert for both create and update (handles out-of-order events)
        const email = evt.data.email_addresses?.[0]?.email_address ?? ''
        const firstName = evt.data.first_name ?? ''
        const lastName = evt.data.last_name ?? ''
        const avatar = evt.data.image_url ?? ''

        await prisma.user.upsert({
          where: { clerkId: evt.data.id },
          update: {
            email,
            firstName,
            lastName,
            avatar
          },
          create: {
            clerkId: evt.data.id,
            email,
            firstName,
            lastName,
            avatar,
            organizationId: null
          }
        })
        console.log('[Webhook] Synced user:', evt.data.id)
        break
      }

      case 'user.deleted': {
        // Delete user if exists (ignore if already deleted)
        try {
          await prisma.user.delete({
            where: { clerkId: evt.data.id }
          })
          console.log('[Webhook] Deleted user:', evt.data.id)
        } catch (err: any) {
          // Prisma error code P2025 = Record not found
          if (err.code !== 'P2025') {
            throw err
          }
          console.log('[Webhook] User already deleted:', evt.data.id)
        }
        break
      }

      default:
        console.log('[Webhook] Unhandled event type:', eventType)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
