import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common"

import { LocalAuthenticatedRequest } from "./interfaces/local-authenticated-request.interface"
import { JwtResetPasswordAuthGuard } from "./guards/jwt-reset-password.guard"
import { JwtRefreshTokenAuthGuard } from "./guards/jwt-refresh-token.guard"
import { SignUpWithSupabaseDto } from "./dto/sign-up-with-supabase.dto"
import { SignInWithSupabaseDto } from "./dto/sign-in-with-supabase.dto"
import { InjectUser } from "./decorators/inject-user.decorator"
import { ForgotPasswordDto } from "./dto/forgot-password.dto"
import { ChangePasswordDto } from "./dto/change-password.dto"
import { ResetPasswordDto } from "./dto/reset-password.dto"
import { LocalAuthGuard } from "./guards/local-auth.guard"
import { RefreshTokenDto } from "./dto/refresh-token.dto"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { SignUpDto } from "./dto/sign-up.dto"
import { AuthService } from "./auth.service"

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("sign-in")
    @UseGuards(LocalAuthGuard)
    async signIn(@Req() req: LocalAuthenticatedRequest) {
        return await this.authService.signIn(req.user)
    }

    @Post("sign-in/supabase")
    async signInWithSupabase(@Body() singInWithSupabaseDto: SignInWithSupabaseDto) {
        return await this.authService.signInWithSupabase(singInWithSupabaseDto)
    }

    @Post("sign-up")
    async signUp(@Body() signUpDto: SignUpDto) {
        return await this.authService.signUp(signUpDto)
    }

    @Post("sign-up/supabase")
    async signUpWithSupabase(@Body() singUpWithSupabaseDto: SignUpWithSupabaseDto) {
        return await this.authService.signUpWithSupabase(singUpWithSupabaseDto)
    }

    @Post("refresh-token")
    @UseGuards(JwtRefreshTokenAuthGuard)
    async refreshToken(@InjectUser("id") userId: string, @Body() refreshTokenDto: RefreshTokenDto) {
        return await this.authService.refreshToken(userId, refreshTokenDto)
    }

    @Post("forgot-password")
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return await this.authService.forgotPassword(forgotPasswordDto)
    }

    @Post("reset-password")
    @UseGuards(JwtResetPasswordAuthGuard)
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto, @InjectUser("id") userId: string) {
        return await this.authService.resetPassword(userId, resetPasswordDto)
    }

    @Post("change-password")
    @UseGuards(JwtAuthGuard)
    async changePassword(@Body() changePasswordDto: ChangePasswordDto, @InjectUser("id") userId: string) {
        return await this.authService.changePassword(userId, changePasswordDto)
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    async getMe(@InjectUser() user: JwtAuthGuard) {
        return user
    }
}
