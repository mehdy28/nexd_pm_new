// lib/email/index.ts
import nodemailer from 'nodemailer';
// Removed 'path' import as we are using a direct relative string path
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
// --- Helper Function for Base Mail Options (Handles Embedding) ---
const createBaseMailOptions = (to, subject, htmlContent) => {
    return {
        from: `"nexd.pm" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
        attachments: [
            {
                filename: 'nexdpm-logo.png',
                path: './landing/logo.png', // Local path to the logo image (AS COMMANDED)
                cid: 'logo.png', // The requested CID (AS COMMANDED)
                contentDisposition: 'inline',
                contentType: 'image/png',
            },
        ],
    };
};
// --- Exported Functions (Calling templates without logoUrl) ---
export const sendWorkspaceInvitationEmail = async ({ to, inviterName, workspaceName, token, }) => {
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${token}`;
    // Removed logoUrl usage
    const mailOptions = createBaseMailOptions(to, `You're invited to join ${workspaceName} on nexd.pm`, 
    // Assuming workspaceInvitationTemplate now takes only { inviterName, workspaceName, invitationLink }
    workspaceInvitationTemplate({ inviterName, workspaceName, invitationLink }));
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
    // Removed logoUrl usage
    const mailOptions = createBaseMailOptions(to, 'Confirm your nexd.pm account', 
    // Assuming emailConfirmationTemplate now takes only { firstName, confirmationLink }
    emailConfirmationTemplate({ firstName, confirmationLink }));
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
    // Removed logoUrl usage
    const mailOptions = createBaseMailOptions(to, 'Reset your nexd.pm password', 
    // Assuming passwordResetTemplate now takes only { firstName, resetLink }
    passwordResetTemplate({ firstName, resetLink }));
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
    // Removed logoUrl usage
    const mailOptions = createBaseMailOptions(to, "You're on the list for nexd.pm!", 
    // Using the updated template function signature
    earlyAccessConfirmationTemplate({ name }));
    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    }
    catch (error) {
        console.error('Error sending early access confirmation email:', error);
        throw new Error('Failed to send early access confirmation email.');
    }
};
