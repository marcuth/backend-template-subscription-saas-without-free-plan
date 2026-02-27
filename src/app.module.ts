import { ConfigModule, ConfigService } from "@nestjs/config"
import { CacheModule } from "@nestjs/cache-manager"
import { Module } from "@nestjs/common"
import KeyvRedis from "@keyv/redis"
import { Keyv } from "cacheable"

import { StripeWebhookModule } from "./stripe-webhook/stripe-webhook.module"
import { SubscriptionsModule } from "./subscriptions/subscriptions.module"
import { SupabaseModule } from "./supabase/supabase.module"
import { StripeGlobalModule } from "./stripe-global.module"
import { UsersModule } from "./users/users.module"
import { PlansModule } from "./plans/plans.module"
import { AuthModule } from "./auth/auth.module"

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        StripeGlobalModule,
        UsersModule,
        AuthModule,
        StripeWebhookModule,
        PlansModule,
        SubscriptionsModule,
        SupabaseModule,
        CacheModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const redisStore = new KeyvRedis(configService.getOrThrow<string>("REDIS_URL"))

                return {
                    stores: [
                        new Keyv({
                            store: redisStore,
                        }),
                    ],
                    ttl: +configService.getOrThrow<string>("REDIS_TTL"),
                }
            },
        }),
    ],
})
export class AppModule {}
