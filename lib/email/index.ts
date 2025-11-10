import nodemailer from 'nodemailer';
import { workspaceInvitationTemplate } from './templates/workspace-invitation';

// Create a transporter using your Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  workspaceName: string;
  token: string;
}

export const sendWorkspaceInvitationEmail = async ({
  to,
  inviterName,
  workspaceName,
  token,
}: SendInvitationEmailParams) => {
  // Construct the full invitation link. The frontend will handle the redirect to register.
  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${token}`;

  const mailOptions = {
    from: `"Nexd" <${process.env.GMAIL_USER}>`,
    to,
    subject: `You're invited to join ${workspaceName} on Nexd`,
    html: workspaceInvitationTemplate({ inviterName, workspaceName, invitationLink }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Invitation email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email.');
  }
};