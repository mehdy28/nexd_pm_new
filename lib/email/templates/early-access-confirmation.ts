//lib/email/templates/early-access-confirmation.ts
interface TemplateParams {
  name: string;
}

export const earlyAccessConfirmationTemplate = ({ name }: TemplateParams): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the list!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #FCFBE5; background-color: #1E293B; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #1E293B; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #184B84; }
    .content { text-align: left; }
    .content p { margin-bottom: 1em; color: #FCFBE5; }
    .content p strong { color: #184B84; } /* Important text */
    .highlight { font-size: 1.2em; text-align: center; margin: 25px 0; padding: 15px; background-color: #1E293B; border-left: 4px solid #184B84; color: #FCFBE5; }
    .highlight strong { color: #184B84; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; color: #FCFBE5; }
    a { color: #184B84; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img 
       src="http://localhost:3000//landing/logo.png"
       alt="nexd.pm Logo" style="max-width: 150px; margin: 0 auto; display: block;">
    </div>
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for your interest in nexd.pm. We've successfully added you to our early access waitlist.</p>
      <div class="highlight">
        <strong>You're all set!</strong>
      </div>
      <p>We're working hard to put the finishing touches on the first AI-powered project management platform. We'll send you an email as soon as we're ready for you to join.</p>
      <p>Stay tuned,<br>The nexd.pm Team</p>
    </div>
    <div class="footer">
      <p>You received this email because you signed up for the waitlist at nexd.pm.</p>
    </div>
  </div>
</body>
</html>
`;