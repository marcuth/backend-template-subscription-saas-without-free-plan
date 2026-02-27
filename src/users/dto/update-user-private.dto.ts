import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

import { UpdateUserPublicDto } from "./update-user.dto"

export class UpdateUserPrivateDto extends UpdateUserPublicDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    supabaseId?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsObject()
    featureUsage?: object

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    planId?: string
}
