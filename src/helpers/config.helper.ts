import { ValidationPipe } from "@nestjs/common"
import { env } from "@marcuth/env"

const isProduction = env("NODE_ENV", false) === "production"

const configHelper = {
    isProduction: isProduction,
    isDevelopment: !isProduction,
    app: {
        metadata: {
            name: "Bolierplate",
            version: "0.0.1",
        },
        port: env("PORT", false) || 3003,
        validationPipe: new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
        cors: {
            methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
            origin: env("CORS_ORIGIN", false) || true,
            credentials: true,
        },
    },
    pagination: {
        minPage: 1,
        defaultPage: 1,
        minPerPage: 2,
        defaultPerPage: 20,
        maxPerPage: 50,
    },
    users: {
        apiKey: {
            prefix: "dev_",
            randomCharsLength: 32,
        },
        minNameLength: 3,
        maxNameLength: 100,
        minUsernameLength: 4,
        maxUsernameLength: 16,
        maxEmailLength: 150,
        generatedUsernameLength: 8,
        cacheTTL: 60 * 60,
        defaultFeatureUsage: {},
    },
    discordWebhookUrls: {
        stripeWebhook: env("DISCORD_STRIPE_WEBHOOK_URL"),
        users: env("DISCORD_USERS_WEBHOOK_URL"),
    },
    plans: {
        starter: {
            id: "58e14257-d83b-4c6e-bfad-9587efcf2b7f",
        },
        pro: {
            id: "846e2582-771d-4a50-ae4f-faa650d9a697",
        },
        admin: {
            id: "4cf3ebea-5f26-41bc-b35a-7d21bb081dbd",
        },
    },
}

export default configHelper
