import { AuthGuard } from "@nestjs/passport"
import { Injectable } from "@nestjs/common"

@Injectable()
export class JwtResetPasswordAuthGuard extends AuthGuard("jwt-reset-password") {}
