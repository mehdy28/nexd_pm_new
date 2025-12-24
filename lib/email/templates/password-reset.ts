//lib/email/templates/password-reset.ts
interface TemplateParams {
  firstName: string;
  resetLink: string;
  logoUrl: string;
}

export const passwordResetTemplate = ({ firstName, resetLink, logoUrl }: TemplateParams): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
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
      <img src="${logoUrl}" alt="Nexd.PM Logo" style="max-width: 150px; margin: 0 auto; display: block;">
    </div>
    <div class="content">
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>We received a request to reset your password for your Nexd.PM account. Click the button below to set a new password:</p>
      <div class="button-container">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      <p>If you're having trouble with the button, copy and paste this link into your browser:</p>
      <p><a href="${resetLink}" style="color: #184B84;">${resetLink}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>Thanks,<br>The Nexd.PM Team</p>
    </div>
    <div class="footer">
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
`;