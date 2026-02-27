import { Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service"
import messagesHelper from "../helpers/messages.helper"

@Injectable()
export class PlansService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll() {
        return await this.prisma.plan.findMany()
    }

    async findOne(id: string) {
        const plan = await this.prisma.plan.findUnique({
            where: {
                id: id,
            },
        })

        if (!plan) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "Plan",
                    property: "id",
                    value: id,
                }),
            )
        }

        return plan
    }

    async findOneByStripePriceId(stripePriceId: string) {
        const plan = await this.prisma.plan.findUnique({
            where: {
                externalPriceId: stripePriceId,
            },
        })

        if (!plan) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({
                    name: "Plan",
                    property: "extrenalPriceId",
                    value: stripePriceId,
                }),
            )
        }

        return plan
    }
}
