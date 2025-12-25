//lib/email/templates/workspace-invitation.ts
interface TemplateParams {
  inviterName: string;
  workspaceName: string;
  invitationLink: string;
}

export const workspaceInvitationTemplate = ({ inviterName, workspaceName, invitationLink }: TemplateParams): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${workspaceName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #FCFBE5; background-color: #1E293B; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #1E293B; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #184B84; }
    .content { text-align: left; }
    .content p { margin-bottom: 1em; color: #FCFBE5; }
    .content p strong { color: #184B84; } /* Important text */
    .button-container { text-align: center; }
    .button { display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #5F7C8A; color: #FCFBE5 !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; color: #FCFBE5; }
    a { color: #184B84; } /* Links that are not buttons, considered important text */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img 
       src="https://nexdpm.com/landing/logo.png"
       alt="nexd.pm Logo" style="max-width: 150px; margin: 0 auto; display: block;">    </div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to collaborate in the <strong>${workspaceName}</strong> workspace on nexd.pm.</p>
      <p>Click the button below to accept your invitation. If you don't have an account, you'll be redirected to create one first.</p>
      <div class="button-container">
        <a href="${invitationLink}" class="button">Accept Invitation & Join Workspace</a>
      </div>
      <p>If you're having trouble with the button, you can copy and paste this link into your browser:</p>
      <p><a href="${invitationLink}" style="color: #184B84;">${invitationLink}</a></p>
      <p>This invitation will expire in 7 days.</p>
      <p>Thanks,<br>The nexd.pm Team</p>
    </div>
    <div class="footer">
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
`;