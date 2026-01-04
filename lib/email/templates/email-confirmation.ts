//lib/email/templates/email-confirmation.ts
interface TemplateParams {
  firstName: string;
  confirmationLink: string;
}

export const emailConfirmationTemplate = ({ firstName, confirmationLink }: TemplateParams): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email</title>
  <style>
    /* Applied the nexd.pm color palette */
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      line-height: 1.6; 
      color: #222222; /* Dark Gray for main text */
      background-color: #EFF1F3; /* Light Gray background */
      margin: 0; 
      padding: 20px; /* Padding for mobile-friendliness */
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      border: 1px solid #D8DDE1; /* Light Gray for borders */
      border-radius: 8px; 
      background-color: #FFFFFF; /* White for the main content area */
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
       alt="nexd.pm Logo" style="max-width: 150px; margin: 0 auto; display: block;">    </div>
    <div class="content">
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>Thank you for signing up. Please confirm your email address to activate your account and start managing your projects.</p>
      <div class="button-container">
        <a href="${confirmationLink}" class="button">Confirm Email Address</a>
      </div>
      <p>If you're having trouble with the button, you can copy and paste this link into your browser:</p>
      <p><a href="${confirmationLink}" style="color: #678B99; text-decoration: underline; word-break: break-all;">${confirmationLink}</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>Thanks,<br>The nexd.pm Team</p>
    </div>
    <div class="footer">
      <p>If you did not create an account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
`;