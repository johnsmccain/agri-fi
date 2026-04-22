import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTradeDealDto {
  @IsString()
  @IsNotEmpty()
  commodity: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsIn(['kg', 'tons'])
  quantity_unit: 'kg' | 'tons';

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  total_value: number;

  @IsUUID()
  farmer_id: string;

  @IsDateString()
  delivery_date: string;
}
