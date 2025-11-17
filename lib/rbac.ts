import { getDB } from './db'

export async function canManageSurvey(userId: string, surveyId: string): Promise<boolean> {
  const prisma = getDB()
  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { createdBy: true, organizationId: true, organization: { select: { ownerId: true } } } })
  if (!survey) return false
  if (survey.createdBy === userId || survey.organization.ownerId === userId) return true
  const membership = await prisma.organizationMember.findFirst({ where: { organizationId: survey.organizationId, userId } })
  return membership?.role === 'admin'
}

export async function canManageCampaign(userId: string, campaignId: string): Promise<boolean> {
  const prisma = getDB()
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { createdBy: true, survey: { select: { organizationId: true, organization: { select: { ownerId: true } } } } } })
  if (!campaign) return false
  if (campaign.createdBy === userId || campaign.survey.organization.ownerId === userId) return true
  const membership = await prisma.organizationMember.findFirst({ where: { organizationId: campaign.survey.organizationId, userId } })
  return membership?.role === 'admin'
}

export async function canReadSurveyInOrg(userId: string, surveyId: string): Promise<boolean> {
  const prisma = getDB()
  const record = await prisma.survey.findFirst({
    where: {
      id: surveyId,
      OR: [
        { organization: { ownerId: userId } },
        { organization: { members: { some: { userId } } } },
        { createdBy: userId }
      ]
    },
    select: { id: true }
  })
  return !!record
}

export async function isOrgAdmin(userId: string, organizationId: string): Promise<boolean> {
  const prisma = getDB()
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { ownerId: true } })
  if (!org) return false
  if (org.ownerId === userId) return true
  const m = await prisma.organizationMember.findFirst({ where: { organizationId, userId } })
  return m?.role === 'admin'
}

export async function isOrgMember(userId: string, organizationId: string): Promise<boolean> {
  const prisma = getDB()
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { ownerId: true } })
  if (!org) return false
  if (org.ownerId === userId) return true
  const m = await prisma.organizationMember.findFirst({ where: { organizationId, userId } })
  return !!m
}

export async function canManageQuestion(userId: string, questionId: string): Promise<boolean> {
  const prisma = getDB()
  const question = await prisma.surveyQuestion.findUnique({
    where: { id: questionId },
    select: { surveyId: true }
  })
  if (!question) return false
  return canManageSurvey(userId, question.surveyId)
}

export async function assertCanManageSurvey(user: { id: string }, surveyId: string): Promise<void> {
  const allowed = await canManageSurvey(user.id, surveyId)
  if (!allowed) {
    throw new Error('Forbidden: You do not have permission to manage this survey')
  }
}

/**
 * Check if user can view campaign (any member role: viewer, collector, admin)
 */
export async function canViewCampaign(userId: string, campaignId: string): Promise<boolean> {
  const prisma = getDB()
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      createdBy: true,
      survey: {
        select: {
          organizationId: true,
          organization: { select: { ownerId: true } }
        }
      },
      members: {
        where: { userId },
        select: { role: true, status: true }
      }
    }
  })

  if (!campaign) return false

  // Creator and org owner always have access
  if (campaign.createdBy === userId || campaign.survey.organization.ownerId === userId) return true

  // Org admins have access
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: campaign.survey.organizationId, userId }
  })
  if (membership?.role === 'admin') return true

  // Check campaign membership (any active member can view)
  const campaignMember = campaign.members[0]
  return campaignMember?.status === 'active'
}

/**
 * Check if user can collect responses in campaign (collector or admin role)
 */
export async function canCollectInCampaign(userId: string, campaignId: string): Promise<boolean> {
  const prisma = getDB()
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      createdBy: true,
      survey: {
        select: {
          organizationId: true,
          organization: { select: { ownerId: true } }
        }
      },
      members: {
        where: { userId },
        select: { role: true, status: true }
      }
    }
  })

  if (!campaign) return false

  // Creator and org owner can always collect
  if (campaign.createdBy === userId || campaign.survey.organization.ownerId === userId) return true

  // Org admins can collect
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: campaign.survey.organizationId, userId }
  })
  if (membership?.role === 'admin') return true

  // Check campaign membership (collector or admin role)
  const campaignMember = campaign.members[0]
  return campaignMember?.status === 'active' &&
    (campaignMember.role === 'collector' || campaignMember.role === 'admin')
}

/**
 * Check if user can manage campaign members (admin role only)
 * This is for adding/removing members and changing roles
 */
export async function canEditCampaignMember(userId: string, campaignId: string): Promise<boolean> {
  const prisma = getDB()
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      createdBy: true,
      survey: {
        select: {
          organizationId: true,
          organization: { select: { ownerId: true } }
        }
      },
      members: {
        where: { userId },
        select: { role: true, status: true }
      }
    }
  })

  if (!campaign) return false

  // Creator and org owner can manage
  if (campaign.createdBy === userId || campaign.survey.organization.ownerId === userId) return true

  // Org admins can manage
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: campaign.survey.organizationId, userId }
  })
  if (membership?.role === 'admin') return true

  // Campaign admin role can manage members
  const campaignMember = campaign.members[0]
  return campaignMember?.status === 'active' && campaignMember.role === 'admin'
}
