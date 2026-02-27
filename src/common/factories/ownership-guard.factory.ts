import { CanActivate, Inject, Injectable, Type } from "@nestjs/common"

import { OwnershipGuard, RESOURCE_SERVICE_KEY } from "../guards/ownership.guard"
import { ResourceService } from "../interfaces/resource-service.interface"
import { UserRole } from "../../generated/prisma/enums"

export function OwnershipGuardFactory<T>(ownerIdProperty: string, allowedRoles?: UserRole[]): Type<CanActivate> {
    @Injectable()
    class InternalOwnershipGuard extends OwnershipGuard<T> {
        constructor(@Inject(RESOURCE_SERVICE_KEY) resourceService: ResourceService<T>) {
            super(resourceService, ownerIdProperty, allowedRoles)
        }
    }

    return InternalOwnershipGuard
}
