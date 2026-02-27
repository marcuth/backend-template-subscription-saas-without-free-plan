import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

import regexHelper from "../../helpers/regex.helper"

export class ChangePasswordDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    currentPassword?: string

    @ApiProperty()
    @Matches(regexHelper.password)
    newPassword: string
}
