//lib/email/index.ts
import nodemailer from 'nodemailer';
import { workspaceInvitationTemplate } from './templates/workspace-invitation.js';
import { emailConfirmationTemplate } from './templates/email-confirmation.js';
import { passwordResetTemplate } from './templates/password-reset.js';
import { earlyAccessConfirmationTemplate } from './templates/early-access-confirmation.js';
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});
export const sendWorkspaceInvitationEmail = async ({ to, inviterName, workspaceName, token, }) => {
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${token}`;
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/logo.png`;
    const mailOptions = {
        from: `"nexd.pm" <${process.env.GMAIL_USER}>`,
        to,
        subject: `You're invited to join ${workspaceName} on nexd.pm`,
        html: workspaceInvitationTemplate({ inviterName, workspaceName, invitationLink, logoUrl }),
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    }
    catch (error) {
        console.error('Error sending invitation email:', error);
        throw new Error('Failed to send invitation email.');
    }
};
export const sendEmailConfirmationEmail = async ({ to, firstName, token, }) => {
    const confirmationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/logo.png`;
    const mailOptions = {
        from: `"nexd.pm" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Confirm your nexd.pm account',
        html: emailConfirmationTemplate({ firstName, confirmationLink, logoUrl }),
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    }
    catch (error) {
        console.error('Error sending confirmation email:', error);
        throw new Error('Failed to send confirmation email.');
    }
};
export const sendPasswordResetEmail = async ({ to, firstName, resetLink, }) => {
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/logo.png`;
    const mailOptions = {
        from: `"nexd.pm" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Reset your nexd.pm password',
        html: passwordResetTemplate({ firstName, resetLink, logoUrl }),
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    }
    catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email.');
    }
};
export const sendEarlyAccessConfirmationEmail = async ({ to, name, }) => {
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/logo.png`;
    const mailOptions = {
        from: `"nexd.pm" <${process.env.GMAIL_USER}>`,
        to,
        subject: "You're on the list for nexd.pm.PM!",
        html: earlyAccessConfirmationTemplate({ name, logoUrl }),
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    }
    catch (error) {
        console.error('Error sending early access confirmation email:', error);
        throw new Error('Failed to send early access confirmation email.');
    }
};
