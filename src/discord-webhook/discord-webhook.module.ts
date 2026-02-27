import { DynamicModule, Module } from "@nestjs/common"

import { DiscordWebhookService } from "./discord-webhook.service"

export type DiscordWebhookOptions = {
    name: string
    url: string
}

@Module({
    providers: [DiscordWebhookService],
})
export class DiscordWebhookModule {
    static forFeature({ name, url }: DiscordWebhookOptions): DynamicModule {
        return {
            module: DiscordWebhookModule,
            providers: [
                {
                    provide: "WEBHOOK_NAME",
                    useValue: name,
                },
                {
                    provide: "WEBHOOK_URL",
                    useValue: url,
                },
                DiscordWebhookService,
            ],
            exports: [DiscordWebhookService],
        }
    }
}
