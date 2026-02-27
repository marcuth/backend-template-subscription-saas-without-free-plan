import { UserRole } from "../../generated/prisma/enums"
import { Request } from "express"

export interface JwtAuthenticatedUser {
    id: string
    email: string
    username: string
    role: UserRole
    name: string
}

export interface JwtAuthenticatedRequest extends Request {
    user: JwtAuthenticatedUser
}
