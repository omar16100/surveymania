import { canViewCampaign, canCollectInCampaign, canEditCampaignMember, canManageCampaign } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export type CampaignRole = 'viewer' | 'collector' | 'admin' | 'manage'

/**
 * Middleware helper to check campaign access based on minimum required role
 *
 * @param userId - User ID to check permission for
 * @param campaignId - Campaign ID to check access to
 * @param minRole - Minimum role required ('viewer', 'collector', 'admin', 'manage')
 * @returns true if user has access, false otherwise
 *
 * Role hierarchy:
 * - 'viewer': Can view campaign data
 * - 'collector': Can collect responses (includes viewer permissions)
 * - 'admin': Can manage campaign members (includes collector permissions)
 * - 'manage': Can edit/delete campaign itself (creator, org owner, org admin only)
 */
export async function requireCampaignAccess(
  userId: string,
  campaignId: string,
  minRole: CampaignRole
): Promise<boolean> {
  switch (minRole) {
    case 'viewer':
      return await canViewCampaign(userId, campaignId)

    case 'collector':
      return await canCollectInCampaign(userId, campaignId)

    case 'admin':
      return await canEditCampaignMember(userId, campaignId)

    case 'manage':
      return await canManageCampaign(userId, campaignId)

    default:
      return false
  }
}

/**
 * Helper to return 403 Forbidden response with consistent error message
 */
export function forbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: message || 'Forbidden: You do not have permission to access this campaign'
    },
    { status: 403 }
  )
}

/**
 * Helper to return 404 Not Found response
 */
export function notFoundResponse(resource: string = 'Campaign'): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  )
}
