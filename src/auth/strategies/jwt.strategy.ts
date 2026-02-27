import { Injectable, UnauthorizedException } from "@nestjs/common"
import { plainToInstance } from "class-transformer"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { validateSync } from "class-validator"
import { ConfigService } from "@nestjs/config"

import { JwtAuthenticatedUser } from "../interfaces/jwt-authenticated-request.interface"
import { JwtAccessPayload } from "../interfaces/jwt-payload.interface"
import { JwtAccessPayloadDto } from "../dto/jwt-access-payload.dto"
import messagesHelper from "../../helpers/messages.helper"
import { UserRole } from "../../generated/prisma/enums"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
    constructor(readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.getOrThrow<string>("JWT_PRIVATE_KEY"),
        })
    }

    validate(payload: JwtAccessPayload): JwtAuthenticatedUser {
        const dto = plainToInstance(JwtAccessPayloadDto, payload)
        const errors = validateSync(dto)

        if (errors.length > 0) {
            throw new UnauthorizedException(messagesHelper.INVALID_AUTHORIZATION_TOKEN)
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role as UserRole,
            username: payload.username,
            name: payload.name,
        }
    }
}
