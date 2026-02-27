import { ExecutionContext, ForbiddenException, Inject, NotFoundException, UnauthorizedException } from "@nestjs/common"

import { JwtAuthenticatedUser } from "../../auth/interfaces/jwt-authenticated-request.interface"
import { ResourceService } from "../interfaces/resource-service.interface"
import messagesHelper from "../../helpers/messages.helper"
import { UserRole } from "../../generated/prisma/client"

export const RESOURCE_SERVICE_KEY = Symbol("RESOURCE_SERVICE")

export class OwnershipGuard<T> {
    constructor(
        @Inject(RESOURCE_SERVICE_KEY) private readonly resourceService: ResourceService<T>,
        private readonly ownerIdProperty: string,
        private readonly allowedRoles: UserRole[] = [UserRole.ADMIN],
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const user = request.user as JwtAuthenticatedUser

        if (!user) {
            throw new UnauthorizedException(messagesHelper.REQUEST_WITHOUT_AUTHORIZATION_TOKEN)
        }

        if (this.allowedRoles && this.allowedRoles.includes(user.role)) {
            return true
        }

        const resourceId = request.params?.id

        if (!resourceId) {
            throw new ForbiddenException(messagesHelper.RESOURCE_ID_NOT_PROVIDED)
        }

        const resource = await this.resourceService.findOne(resourceId)

        if (!resource) {
            throw new NotFoundException(messagesHelper.RESOURCE_NOT_FOUND)
        }

        if (resource[this.ownerIdProperty] !== user.id) {
            throw new ForbiddenException(messagesHelper.RESOURCE_ACCESS_UNAUTHORIZED)
        }

        return true
    }
}
