import nodemailer, { SendMailOptions } from 'nodemailer';
// Removed 'path' import as it's no longer needed
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

// --- Interfaces ---
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


// --- Helper Function for Base Mail Options (No longer handles attachments) ---
const createBaseMailOptions = (
  to: string,
  subject: string,
  htmlContent: string
): SendMailOptions => {
  return {
    from: `"nexd.pm" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: htmlContent,
    // FIX: Removed the attachments array entirely to prevent file system errors.
  };
};


// --- Exported Functions ---

export const sendWorkspaceInvitationEmail = async ({
  to,
  inviterName,
  workspaceName,
  token,
}: SendInvitationEmailParams) => {
  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${token}`;
  
  const mailOptions = createBaseMailOptions(
    to,
    `You're invited to join ${workspaceName} on nexd.pm`,
    workspaceInvitationTemplate({ inviterName, workspaceName, invitationLink })
  );

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
  
  const mailOptions = createBaseMailOptions(
    to,
    'Confirm your nexd.pm account',
    emailConfirmationTemplate({ firstName, confirmationLink })
  );

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
  const mailOptions = createBaseMailOptions(
    to,
    'Reset your nexd.pm password',
    passwordResetTemplate({ firstName, resetLink })
  );

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
  const mailOptions = createBaseMailOptions(
    to,
    "You're on the list for nexd.pm!",
    earlyAccessConfirmationTemplate({ name })
  );

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending early access confirmation email:', error);
    throw new Error('Failed to send early access confirmation email.');
  }
};
