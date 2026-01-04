interface TemplateParams {
  name: string;
}

export const earlyAccessConfirmationTemplate = ({ name }: TemplateParams): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Applied the nexdpm color palette */
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
      background-color: #ffffff; /* White for the main content area */
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
    .highlight { 
      font-size: 1.2em; 
      text-align: center; 
      margin: 25px 0; 
      padding: 15px; 
      background-color: #eeeff3; /* Background color to match the body */
      border-left: 4px solid #678B99; /* Slate Blue-Gray accent */
      color: #222222; 
    }
    .highlight strong { 
      color: #678B99; /* Slate Blue-Gray accent */
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
      <a href="https://nexdpm.com" target="_blank" rel="noopener noreferrer">
        <img 
         src="https://nexdpm.com/landing/logo.png"
         alt="nexdpm Logo" style="max-width: 150px; margin: 0 auto; display: block; border: 0;">
      </a>
    </div>
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for your interest in <a href="https://nexdpm.com" target="_blank" rel="noopener noreferrer">nexdpm</a>. We've successfully added you to our early access waitlist.</p>
      <div class="highlight">
        <strong>You're all set!</strong>
      </div>
      <p>We're working hard to put the finishing touches on the first AI-powered project management platform. We'll send you an email as soon as we're ready for you to join.</p>
      <p>Stay tuned,<br>The <a href="https://nexdpm.com" target="_blank" rel="noopener noreferrer">nexdpm</a> Team</p>
    </div>
    <div class="footer">
      <p>You received this email because you signed up for the waitlist at <a href="https://nexdpm.com" target="_blank" rel="noopener noreferrer">nexdpm</a>.</p>
    </div>
  </div>
</body>
</html>
`;