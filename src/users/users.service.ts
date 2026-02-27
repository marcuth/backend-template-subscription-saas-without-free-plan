import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common"
import { createPaginator, PaginateOptions } from "prisma-pagination"
import { InjectStripeClient } from "@golevelup/nestjs-stripe"
import { ConfigService } from "@nestjs/config"
import { Cache } from "@nestjs/cache-manager"
import Stripe from "stripe"

import { InjectCacheManager } from "../common/decorators/inject-cache-manager.decorator"
import { DiscordWebhookService } from "../discord-webhook/discord-webhook.service"
import { generatePendingUserKey } from "../utils/generate-pending-user-key.util"
import { UpdateUserPrivateDto } from "./dto/update-user-private.dto"
import { generateApiKey } from "../utils/generate-api-key.util"
import { CreateTempUserDto } from "./dto/create-temp-user.dto"
import { Prisma, User } from "../generated/prisma/client"
import { PrismaService } from "../prisma/prisma.service"
import { MailerService } from "../mailer/mailer.service"
import { CryptoService } from "../crypto/crypto.service"
import { UserWithoutSensitiveInfo } from "./users.types"
import messagesHelper from "../helpers/messages.helper"
import { PlansService } from "../plans/plans.service"
import { CreateUserDto } from "./dto/create-user.dto"
import configHelper from "../helpers/config.helper"

@Injectable()
export class UsersService {
    constructor(
        private readonly discordWebhookService: DiscordWebhookService,
        @InjectStripeClient() private readonly stripe: Stripe,
        @InjectCacheManager() private readonly cache: Cache,
        private readonly plansService: PlansService,
        private readonly cryptoService: CryptoService,
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    private async validateNewUser(email: string, username: string): Promise<void> {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: email,
                username: username,
            },
            select: {
                email: true,
                username: true,
            },
        })

        if (existingUser) {
            const property = email === existingUser.email ? "email" : "username"
            const value = property === "email" ? email : username

            throw new ConflictException(
                messagesHelper.OBJECT_ALREADY_EXISTS({
                    name: "User",
                    property: property,
                    value: value,
                }),
            )
        }
    }

    private async sendWelcomeNotifications(user: UserWithoutSensitiveInfo): Promise<void> {
        this.discordWebhookService.safeNotify({
            nameSuffix: "Created",
            type: "success",
            title: "Usuário criado",
            message: `Id do usuário: ${user.id}\nEmail: ${user.email}\n\`\`\`json\n${JSON.stringify({ user: user }, null, 4)}\`\`\``,
        })

        this.mailerService.send({
            senderName: `${configHelper.app.metadata.name} - Conta criada!`,
            subject: `Bem vindo ao ${configHelper.app.metadata.name}`,
            to: user.email,
            senderEmail: this.configService.getOrThrow<string>("BREVO_SENDER_EMAIL"),
            htmlContent: `<h1>Seja bem vindo(a) ao ${configHelper.app.metadata.name}!</h1>`,
        })
    }

    async createTemporarilyInCache(createTempUserDto: CreateTempUserDto) {
        await this.validateNewUser(createTempUserDto.email, createTempUserDto.username)

        const existingCustomers = await this.stripe.customers.list({
            email: createTempUserDto.email,
            limit: 1,
        })

        let customer: Stripe.Customer

        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0]
        } else {
            customer = await this.stripe.customers.create({
                email: createTempUserDto.email,
                name: createTempUserDto.name,
                metadata: {
                    ...(createTempUserDto.planId && { planId: createTempUserDto.planId }),
                    ...(createTempUserDto.supabaseId && { planId: createTempUserDto.supabaseId }),
                },
            })
        }

        const planId = createTempUserDto.planId || configHelper.plans.starter.id

        const dataToCache = {
            ...createTempUserDto,
            stripeCustomerId: customer.id,
            planId: planId,
        }

        const key = generatePendingUserKey(createTempUserDto.email)

        await this.cache.set(key, dataToCache, configHelper.users.cacheTTL)

        const plan = await this.plansService.findOne(planId)

        const session = await this.stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ["card"],
            line_items: [
                {
                    price: plan.externalPriceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: this.configService.getOrThrow<string>("STRIPE_SUCCESS_URL"),
            cancel_url: this.configService.getOrThrow<string>("STRIPE_CANCEL_URL"),
        })

        if (!session.url) {
            throw new InternalServerErrorException(messagesHelper.CHECKOUT_GENERATION_FAILED)
        }

        return {
            checkoutUrl: session.url,
        }
    }

    async create(createUserDto: CreateUserDto) {
        const { password, subscription, ...rest } = createUserDto

        await this.validateNewUser(createUserDto.email, createUserDto.username)

        const generatedApiKey = generateApiKey()
        const encryptedApiKey = this.cryptoService.encrypt(generatedApiKey)
        const hashedPassword = password ? await this.cryptoService.hashPassword(password) : null

        const user = await this.prisma.user.create({
            data: {
                ...rest,
                apiKey: encryptedApiKey,
                password: hashedPassword,
                stripeCustomerId: createUserDto.stripeCustomerId,
                subscription: {
                    create: {
                        status: subscription.status,
                        externalId: subscription.externalId,
                        itemId: subscription.itemId,
                        currentPeriodEnd: subscription.currentPeriodEnd,
                        currentPeriodStart: subscription.currentPeriodStart,
                        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                        canceledAt: subscription.endedAt,
                        endedAt: subscription.canceledAt,
                    },
                },
                featureUsage: configHelper.users.defaultFeatureUsage,
            },
            omit: {
                password: true,
                apiKey: true,
            },
        })

        this.sendWelcomeNotifications(user)

        return {
            ...user,
            apiKey: generatedApiKey,
        }
    }

    async findAll({ page, perPage }: PaginateOptions) {
        const paginate = createPaginator({
            page: page,
            perPage: perPage,
        })

        return await paginate<User, Prisma.UserFindManyArgs>(this.prisma.user, {
            omit: {
                password: true,
                apiKey: true,
            },
        })
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: id,
            },
            omit: {
                password: true,
            },
        })

        if (!user) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "User",
                    value: id,
                }),
            )
        }

        return user
    }

    async findOneByEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: email,
            },
        })

        if (!user) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "User",
                    property: "email",
                    value: email,
                }),
            )
        }

        return user
    }

    async safeFindOneByEmail(email: string) {
        try {
            return await this.findOneByEmail(email)
        } catch (error) {
            if (error instanceof NotFoundException) {
                return null
            } else {
                throw error
            }
        }
    }

    async findOneByApiKey(apiKey: string) {
        const encryptedApiKey = this.cryptoService.encrypt(apiKey)

        const user = await this.prisma.user.findUnique({
            where: {
                apiKey: encryptedApiKey,
            },
        })

        if (!user) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "User",
                    property: "apiKey",
                    value: apiKey,
                }),
            )
        }

        return user
    }

    async findOneBySupabaseId(supabaseId: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                supabaseId: supabaseId,
            },
        })

        if (!user) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "User",
                    property: "supabaseId",
                    value: supabaseId,
                }),
            )
        }

        return user
    }

    async safeFindOneBySupabaseId(supabaseId: string) {
        try {
            return await this.findOneBySupabaseId(supabaseId)
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                return null
            } else {
                throw error
            }
        }
    }

    async update(id: string, updateUserDto: UpdateUserPrivateDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
            },
        })

        if (!existingUser) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "User",
                    property: "id",
                    value: id,
                }),
            )
        }

        return await this.prisma.user.update({
            where: {
                id: id,
            },
            data: {
                ...updateUserDto,
            },
        })
    }

    async updateByStripeCustomerId(stripeCustomerId: string, updateUserDto: UpdateUserPrivateDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                stripeCustomerId: stripeCustomerId,
            },
            select: {
                id: true,
            },
        })

        if (!existingUser) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "User",
                    property: "stripeCustomerId",
                    value: stripeCustomerId,
                }),
            )
        }

        return await this.prisma.user.update({
            where: {
                id: stripeCustomerId,
            },
            data: {
                ...updateUserDto,
            },
        })
    }

    async resetPassword(email: string, password: string) {
        const user = await this.findOneByEmail(email)
        const hashedPassword = await this.cryptoService.hashPassword(password)

        await this.prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                password: hashedPassword,
            },
        })
    }

    async changePassword(id: string, currentPassword: string | undefined, newPassword: string) {
        const hashedCurrentPassword = currentPassword
            ? await this.cryptoService.hashPassword(currentPassword)
            : currentPassword
        const hashedNewPassword = await this.cryptoService.hashPassword(newPassword)

        const user = await this.prisma.user.findUnique({
            where: {
                id: id,
                password: hashedCurrentPassword,
            },
            select: {
                id: true,
            },
        })

        if (!user) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "User",
                    property: "id",
                    value: id,
                }),
            )
        }

        await this.prisma.user.update({
            where: {
                id: id,
            },
            data: {
                password: hashedNewPassword,
            },
        })
    }

    async remove(id: string) {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
            },
        })

        if (!existingUser) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "User",
                    property: "id",
                    value: id,
                }),
            )
        }

        await this.prisma.user.delete({
            where: {
                id: id,
            },
        })
    }
}
