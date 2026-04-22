import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvestmentDto {
  @IsUUID()
  @IsNotEmpty()
  tradeDealId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  tokenAmount: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amountUsd: number;
}
