import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class KycDto {
  @ApiProperty({
    enum: [
      'purchase_agreement',
      'bill_of_lading',
      'export_certificate',
      'warehouse_receipt',
    ],
    example: 'bill_of_lading',
    description: 'Type of KYC document',
  })
  @IsIn([
    'purchase_agreement',
    'bill_of_lading',
    'export_certificate',
    'warehouse_receipt',
  ])
  docType: string;

  @ApiProperty({
    example: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    description: 'IPFS content hash of the document',
  })
  @IsString()
  @IsNotEmpty()
  ipfsHash: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/doc.pdf',
    description: 'Fallback S3 URL for the document',
  })
  @IsString()
  @IsNotEmpty()
  storageUrl: string;
}
