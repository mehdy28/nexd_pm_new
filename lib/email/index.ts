//lib/email/index.ts
import nodemailer from 'nodemailer';
import { workspaceInvitationTemplate } from './templates/workspace-invitation';
import { emailConfirmationTemplate } from './templates/email-confirmation';
import { passwordResetTemplate } from './templates/password-reset';
import { earlyAccessConfirmationTemplate } from './templates/early-access-confirmation';

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

interface SendConfirmationEmailParams {
  to: string;
  firstName: string;
  token: string;
}

interface SendPasswordResetEmailParams {
  to: string;
  firstName: string;
  resetLink: string;
}

interface SendEarlyAccessConfirmationEmailParams {
  to: string;
  name: string;
}

export const sendWorkspaceInvitationEmail = async ({
  to,
  inviterName,
  workspaceName,
  token,
}: SendInvitationEmailParams) => {
  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${token}`;
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/logo.png`;

  const mailOptions = {
    from: `"Nexd" <${process.env.GMAIL_USER}>`,
    to,
    subject: `You're invited to join ${workspaceName} on Nexd`,
    html: workspaceInvitationTemplate({ inviterName, workspaceName, invitationLink, logoUrl }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email.');
  }
};

export const sendEmailConfirmationEmail = async ({
  to,
  firstName,
  token,
}: SendConfirmationEmailParams) => {
  const confirmationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/logo.png`;

  const mailOptions = {
    from: `"Nexd" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Confirm your Nexd account',
    html: emailConfirmationTemplate({ firstName, confirmationLink, logoUrl }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw new Error('Failed to send confirmation email.');
  }
};

export const sendPasswordResetEmail = async ({
  to,
  firstName,
  resetLink,
}: SendPasswordResetEmailParams) => {
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/logo.png`;

  const mailOptions = {
    from: `"Nexd" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reset your Nexd password',
    html: passwordResetTemplate({ firstName, resetLink, logoUrl }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email.');
  }
};

export const sendEarlyAccessConfirmationEmail = async ({
  to,
  name,
}: SendEarlyAccessConfirmationEmailParams) => {
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/logo.png`;

  const mailOptions = {
    from: `"Nexd" <${process.env.GMAIL_USER}>`,
    to,
    subject: "You're on the list for Nexd.PM!",
    html: earlyAccessConfirmationTemplate({ name, logoUrl }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending early access confirmation email:', error);
    throw new Error('Failed to send early access confirmation email.');
  }
};