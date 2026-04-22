import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(['farmer', 'trader', 'investor'])
  role: 'farmer' | 'trader' | 'investor';

  @IsString()
  @IsNotEmpty()
  country: string;
}
