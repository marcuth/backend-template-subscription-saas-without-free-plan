import {
    IsBoolean,
    IsDate,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    MinLength,
    ValidateNested,
} from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"

import { SubscriptionStatus } from "../../generated/prisma/enums"
import configHelper from "../../helpers/config.helper"
import regexHelper from "../../helpers/regex.helper"

export class CreateUserSubscriptionDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    externalId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    itemId: string

    @ApiProperty()
    @IsEnum(SubscriptionStatus)
    status: SubscriptionStatus

    @ApiProperty()
    @IsDate()
    currentPeriodEnd: Date

    @ApiProperty()
    @IsDate()
    currentPeriodStart: Date

    @ApiProperty()
    @IsBoolean()
    cancelAtPeriodEnd: boolean

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDate()
    canceledAt?: Date

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDate()
    endedAt?: Date
}

export class CreateUserDto {
    @ApiProperty()
    @IsString()
    @MinLength(configHelper.users.minNameLength)
    @MaxLength(configHelper.users.maxNameLength)
    name: string

    @ApiProperty()
    @IsString()
    @MinLength(configHelper.users.minUsernameLength)
    @MaxLength(configHelper.users.maxUsernameLength)
    username: string

    @ApiProperty()
    @IsEmail()
    @MaxLength(configHelper.users.maxEmailLength)
    email: string

    @ApiProperty({ required: false })
    @IsOptional()
    @Matches(regexHelper.password)
    password?: string

    @ApiProperty()
    @IsUUID()
    planId: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    supabaseId?: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    stripeCustomerId: string

    @ApiProperty()
    @ValidateNested()
    @Type(() => CreateUserSubscriptionDto)
    subscription: CreateUserSubscriptionDto
}
