import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class WalletDto {
  @ApiProperty({
    example: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    description: 'Stellar public key (G... address)',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}
