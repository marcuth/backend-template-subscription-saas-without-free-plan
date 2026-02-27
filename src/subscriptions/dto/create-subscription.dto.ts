import { IsBoolean, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

import { SubscriptionStatus } from "../../generated/prisma/enums"

export class CreateSubscriptionDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    externalId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    itemId: string

    @ApiProperty({ enum: SubscriptionStatus, enumName: "SubscriptionStatus" })
    @IsEnum(SubscriptionStatus)
    status: SubscriptionStatus

    @ApiProperty()
    @IsDate()
    currentPeriodStart: Date

    @ApiProperty()
    @IsDate()
    currentPeriodEnd: Date

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
