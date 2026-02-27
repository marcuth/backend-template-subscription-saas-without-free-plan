import { Injectable, UnauthorizedException } from "@nestjs/common"
import { plainToInstance } from "class-transformer"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { validateSync } from "class-validator"
import { ConfigService } from "@nestjs/config"

import { JwtPasswordLosingUser } from "../interfaces/jwt-password-losing-user.interface"
import { JwtAccessPayload } from "../interfaces/jwt-payload.interface"
import { JwtForgotPasswordDto } from "../dto/jwt-reset-password.dto"
import messagesHelper from "../../helpers/messages.helper"

@Injectable()
export class JwtResetPasswordStrategy extends PassportStrategy(Strategy, "jwt-reset-password") {
    constructor(readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.getOrThrow<string>("JWT_PRIVATE_KEY"),
            ignoreExpiration: true,
        })
    }

    validate(payload: JwtAccessPayload): JwtPasswordLosingUser {
        const dto = plainToInstance(JwtForgotPasswordDto, payload)
        const errors = validateSync(dto)

        if (errors.length > 0) {
            throw new UnauthorizedException(messagesHelper.INVALID_AUTHORIZATION_TOKEN)
        }

        return {
            email: payload.email,
        }
    }
}
