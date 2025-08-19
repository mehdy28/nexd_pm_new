# NEXD.PM Setup Guide

This guide will help you set up the NEXD.PM project management application with Firebase authentication, PostgreSQL database, and GraphQL API.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Firebase project
- Git

## 1. Clone and Install

\`\`\`bash
git clone <your-repo-url>
cd nexd-pm
npm install
\`\`\`

## 2. Environment Configuration

1. Copy the environment template:
\`\`\`bash
cp .env.example .env.local
\`\`\`

2. Fill in your environment variables in `.env.local`:

### Database Setup
- Create a PostgreSQL database
- Update `DATABASE_URL` with your database connection string

### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication with Email/Password
4. Enable Firestore Database
5. Get your config from Project Settings > General > Your apps
6. Fill in all `NEXT_PUBLIC_FIREBASE_*` variables

### JWT Secret
Generate a secure random string for `JWT_SECRET`:
\`\`\`bash
openssl rand -base64 32
\`\`\`

### Stripe (Optional - for billing)
1. Create a Stripe account
2. Get your API keys from the Stripe dashboard
3. Fill in `STRIPE_*` variables

## 3. Database Setup

1. Generate Prisma client:
\`\`\`bash
npx prisma generate
\`\`\`

2. Push database schema:
\`\`\`bash
npx prisma db push
\`\`\`

3. (Optional) Seed the database:
\`\`\`bash
npx prisma db seed
\`\`\`

## 4. Firebase Setup

1. In Firebase Console, go to Authentication > Sign-in method
2. Enable Email/Password authentication
3. In Firestore Database, create the database in production mode
4. Set up security rules (see Firebase documentation)

## 5. Development

Start the development server:
\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000` to see your application.

## 6. Production Deployment

### Environment Variables for Production

Update these variables for production:
- `DATABASE_URL` - Your production database URL
- `NEXTAUTH_URL` - Your production domain
- `NODE_ENV=production`
- All Firebase config with production values
- Secure JWT_SECRET and NEXTAUTH_SECRET

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy

## 7. Features

- **Authentication**: Firebase Auth with email/password
- **Database**: PostgreSQL with Prisma ORM
- **API**: GraphQL with Apollo Server
- **UI**: Modern design with Tailwind CSS and shadcn/ui
- **Project Management**: Tasks, projects, workspaces, documents, wireframes
- **Real-time**: Activity feeds and notifications
- **Billing**: Stripe integration (optional)

## 8. Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your `DATABASE_URL` format
   - Ensure PostgreSQL is running
   - Verify database exists and user has permissions

2. **Firebase Authentication Not Working**
   - Verify all Firebase config variables are correct
   - Check Firebase console for authentication settings
   - Ensure domain is added to authorized domains

3. **GraphQL Errors**
   - Check browser network tab for detailed errors
   - Verify API endpoint is accessible
   - Check server logs for GraphQL resolver errors

4. **Build Errors**
   - Run `npm run build` to check for TypeScript errors
   - Ensure all required environment variables are set
   - Check for missing dependencies

### Getting Help

- Check the browser console for client-side errors
- Check server logs for API errors
- Use `npx prisma studio` to inspect database
- Test GraphQL queries at `/api/graphql` endpoint

## 9. Development Workflow

1. **Adding New Features**
   - Update Prisma schema if needed
   - Create GraphQL resolvers and types
   - Add React hooks for data fetching
   - Build UI components
   - Test thoroughly

2. **Database Changes**
   - Update `prisma/schema.prisma`
   - Run `npx prisma db push` for development
   - Run `npx prisma migrate dev` for production migrations

3. **Authentication Changes**
   - Update Firebase security rules
   - Modify authentication hooks
   - Test login/logout flows

## 10. Security Considerations

- Keep environment variables secure
- Use strong JWT secrets
- Configure Firebase security rules properly
- Validate all user inputs
- Use HTTPS in production
- Regular security updates

## Support

For issues and questions, please check the documentation or create an issue in the repository.
