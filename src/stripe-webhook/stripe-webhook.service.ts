import { InjectStripeClient, StripeWebhookHandler } from "@golevelup/nestjs-stripe"
import { Injectable, InternalServerErrorException } from "@nestjs/common"
import { Cache } from "@nestjs/cache-manager"
import Stripe from "stripe"

import { getCurrentSubscriptionPeriods } from "../utils/get-stripe-current-subscription-periods.util"
import { getStripeSubscriptionPriceId } from "../utils/get-stripe-subscription-price-id.util"
import { getStripeSubscriptionItemId } from "../utils/get-stripe-subscription-item-id.util"
import { InjectCacheManager } from "../common/decorators/inject-cache-manager.decorator"
import { DiscordWebhookService } from "../discord-webhook/discord-webhook.service"
import { SubscriptionsService } from "../subscriptions/subscriptions.service"
import { getStripeCustomerId } from "../utils/get-stripe-customer-id.util"
import { CreateTempUserDto } from "../users/dto/create-temp-user.dto"
import { UserWithoutSensitiveInfo } from "../users/users.types"
import messagesHelper from "../helpers/messages.helper"
import { UsersService } from "../users/users.service"
import { PlansService } from "../plans/plans.service"
import { Plan } from "../generated/prisma/client"

type UserWithPlan = UserWithoutSensitiveInfo & { plan?: Plan | null }

export type CachedUser = CreateTempUserDto & {
    stripeCustomerId: string
    planId: string
}

@Injectable()
export class StripeWebhookService {
    constructor(
        private readonly discordWebhookService: DiscordWebhookService,
        private readonly subscriptionsService: SubscriptionsService,
        @InjectStripeClient() private readonly stripe: Stripe,
        @InjectCacheManager() private readonly cache: Cache,
        private readonly usersService: UsersService,
        private readonly plansService: PlansService,
    ) {}

    private async getCustomerById(customerId: string) {
        const customer = await this.stripe.customers.retrieve(customerId)

        if (customer.deleted) {
            throw new InternalServerErrorException(messagesHelper.STRIPE_CUSTOMER_DELETED)
        }

        return customer
    }

    @StripeWebhookHandler("customer.subscription.created")
    async handleCreatedSubscription(event: Stripe.CustomerSubscriptionCreatedEvent) {
        const subscription = event.data.object
        const customerId = getStripeCustomerId(subscription)
        const customer = await this.getCustomerById(customerId)

        if (!customer.email) {
            throw new InternalServerErrorException(messagesHelper.STRIPE_CONSUMER_EMAIL_NOT_REGISTERED)
        }

        let user: UserWithPlan

        const { currentPeriodEnd, currentPeriodStart } = getCurrentSubscriptionPeriods(subscription)
        const existingUser = await this.usersService.findOneByEmail(customer.email)

        if (existingUser) {
            user = existingUser
            await this.usersService.update(existingUser.id, {
                featureUsage: {},
            })

            await this.subscriptionsService.updateByUserId(existingUser.id, {
                externalId: subscription.id,
                status: subscription.status,
                currentPeriodEnd: currentPeriodEnd,
                currentPeriodStart: currentPeriodStart,
            })
        } else {
            const cacheUserKey = `pending_user:${customer.email}`
            const cachedUser = (await this.cache.get(cacheUserKey)) as CachedUser
            const subscriptionItemId = getStripeSubscriptionItemId(subscription)
            const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at) : undefined
            const endedAt = subscription.ended_at ? new Date(subscription.ended_at) : undefined

            await this.cache.del(cacheUserKey)

            user = await this.usersService.create({
                ...cachedUser,
                subscription: {
                    status: subscription.status,
                    currentPeriodStart: currentPeriodStart,
                    currentPeriodEnd: currentPeriodEnd,
                    externalId: subscription.id,
                    itemId: subscriptionItemId,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    canceledAt: canceledAt,
                    endedAt: endedAt,
                },
            })
        }

        this.discordWebhookService.safeNotify({
            nameSuffix: "Create",
            type: "success",
            title: `${user.name} atualizou o plano para ${user.plan?.name}!`,
            message: `Novo status: ${subscription.status}. \`\`\`json\n${JSON.stringify({ user }, null, 4)}\`\`\``,
        })
    }

    @StripeWebhookHandler("customer.subscription.paused")
    async handlePausedSubscription(event: Stripe.CustomerSubscriptionPausedEvent) {
        const subscription = event.data.object
        const customerId = getStripeCustomerId(subscription)
        const priceId = getStripeSubscriptionPriceId(subscription)
        const { currentPeriodEnd, currentPeriodStart } = getCurrentSubscriptionPeriods(subscription)
        const plan = await this.plansService.findOneByStripePriceId(priceId)

        await this.usersService.updateByStripeCustomerId(customerId, {
            planId: plan.id,
        })

        await this.subscriptionsService.updateByStripeCustomerId(customerId, {
            status: subscription.status,
            currentPeriodEnd: currentPeriodStart,
            currentPeriodStart: currentPeriodEnd,
            externalId: subscription.id,
        })
    }

    @StripeWebhookHandler("customer.subscription.updated")
    async handleUpdatedSubscription(event: Stripe.CustomerSubscriptionUpdatedEvent) {
        const subscription = event.data.object
        const customerId = getStripeCustomerId(subscription)
        const priceId = getStripeSubscriptionPriceId(subscription)
        const { currentPeriodEnd, currentPeriodStart } = getCurrentSubscriptionPeriods(subscription)

        const plan = await this.plansService.findOneByStripePriceId(priceId)

        const user = await this.usersService.updateByStripeCustomerId(customerId, {
            planId: plan.id,
        })

        await this.subscriptionsService.updateByStripeCustomerId(customerId, {
            status: subscription.status,
            currentPeriodEnd: currentPeriodStart,
            currentPeriodStart: currentPeriodEnd,
            externalId: subscription.id,
        })

        this.discordWebhookService.safeNotify({
            nameSuffix: "Paused",
            type: "wran",
            title: "Assinatura pausada",
            message: `ID do cliente: ${customerId}\nStatus: ${subscription.status}\n\`\`\`json\n${JSON.stringify({ user: user }, null, 4)}\`\`\``,
        })
    }

    @StripeWebhookHandler("checkout.session.expired")
    async handleExpiredCheckoutSession(event: Stripe.CheckoutSessionExpiredEvent) {
        const session = event.data.object

        this.discordWebhookService.safeNotify({
            nameSuffix: "Expired",
            type: "error",
            title: `Sessão de checkout expirada`,
            message: `Sessão ID: ${session.id}\nCliente: ${session.customer}\n\`\`\`json\n${JSON.stringify(
                {
                    customer: session.customer,
                },
                null,
                4,
            )}\`\`\``,
        })
    }
}
