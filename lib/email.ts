import { Resend } from 'resend'

// Resend client (singleton)
let resendInstance: Resend | null = null

function getResendClient(): Resend | null {
  // Return null if API key not configured (optional feature)
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key not configured. Email sending disabled.')
    return null
  }

  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }

  return resendInstance
}

type SendInviteEmailParams = {
  to: string
  organizationName: string
  inviterName: string
  inviteToken: string
  role: string
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
  const resend = getResendClient()

  if (!resend) {
    console.warn('Email not sent: Resend not configured')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${params.inviteToken}`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: params.to,
      subject: `You've been invited to join ${params.organizationName} on SurveyMania`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to ${params.organizationName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SurveyMania</h1>
          </div>

          <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>

            <p style="font-size: 16px; color: #4b5563;">
              <strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> as a <strong>${params.role}</strong>.
            </p>

            <p style="font-size: 16px; color: #4b5563;">
              Accept this invitation to start collaborating on surveys and campaigns.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Or copy and paste this URL into your browser:<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>

            <p style="font-size: 14px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
    })
  } catch (error) {
    console.error('Failed to send invite email:', error)
    throw new Error('Failed to send invitation email')
  }
}
