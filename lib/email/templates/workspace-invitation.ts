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
    /* Applied the nexd.pm color palette */
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      line-height: 1.6; 
      color: #222222; /* Dark Gray for main text */
      background-color: #eeeff3; /* Light Gray background */
      margin: 0; 
      padding: 20px; /* Padding for mobile-friendliness */
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      border: 1px solid #D8DDE1; /* Light Gray for borders */
      border-radius: 8px; 
      background-color: #eeeff3; /* White for the main content area */
    }
    .header { 
      text-align: center; 
      margin-bottom: 20px; 
      padding-bottom: 20px; 
      border-bottom: 1px solid #D8DDE1; /* Light Gray divider */
    }
    .content { 
      text-align: left; 
    }
    .content p { 
      margin-bottom: 1em; 
      color: #222222; 
    }
    .content p strong { 
      color: #678B99; /* Slate Blue-Gray accent */
    } 
    .button-container { 
      text-align: center; 
    }
    .button { 
      display: inline-block; 
      padding: 12px 24px; 
      margin: 20px 0; 
      background-color: #678B99; /* Slate Blue-Gray accent for button */
      color: #FFFFFF !important; /* White text for button */
      text-decoration: none; 
      border-radius: 5px; 
      font-weight: bold; 
    }
    .footer { 
      text-align: center; 
      margin-top: 20px; 
      font-size: 0.8em; 
      color: #6F6F6F; /* Medium Gray for less important text */
    }
    a { 
      color: #678B99; /* Slate Blue-Gray for links */
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img 
       src="https://nexdpm.com/landing/logo.png"
       alt="nexd.pm Logo" style="max-width: 150px; margin: 0 auto; display: block;">    
    </div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to collaborate in the <strong>${workspaceName}</strong> workspace on nexd.pm.</p>
      <p>Click the button below to accept your invitation. If you don't have an account, you'll be redirected to create one first.</p>
      <div class="button-container">
        <a href="${invitationLink}" class="button">Accept Invitation & Join Workspace</a>
      </div>
      <p>If you're having trouble with the button, you can copy and paste this link into your browser:</p>
      <p><a href="${invitationLink}" style="color: #678B99; text-decoration: underline; word-break: break-all;">${invitationLink}</a></p>
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