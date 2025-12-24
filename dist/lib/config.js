export const config = {
    database: {
        url: process.env.DATABASE_URL,
    },
    firebase: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    graphql: {
        endpoint: process.env.GRAPHQL_ENDPOINT || "http://localhost:3000/api/graphql",
    },
    jwt: {
        secret: process.env.JWT_SECRET,
    },
    nextAuth: {
        url: process.env.NEXTAUTH_URL || "http://localhost:3000",
        secret: process.env.NEXTAUTH_SECRET,
    },
    stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    email: {
        host: process.env.SMTP_HOST,
        port: Number.parseInt(process.env.SMTP_PORT || "587"),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    upload: {
        maxSize: Number.parseInt(process.env.UPLOAD_MAX_SIZE || "10485760"),
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(",") || [
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
            "text/plain",
        ],
    },
    redis: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
    },
    app: {
        env: process.env.NODE_ENV || "development",
        isDev: process.env.NODE_ENV === "development",
        isProd: process.env.NODE_ENV === "production",
    },
};
// Validate required environment variables
const requiredEnvVars = [
    "DATABASE_URL",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "JWT_SECRET",
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
