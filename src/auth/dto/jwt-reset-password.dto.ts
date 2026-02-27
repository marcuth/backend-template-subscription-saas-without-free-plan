import { IsEmail, IsIn } from "class-validator"

export class JwtForgotPasswordDto {
    @IsEmail()
    sub: string

    @IsIn(["resetPassword"])
    type: "resetPassword"
}
