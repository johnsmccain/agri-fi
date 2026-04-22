import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class KycDto {
  @IsIn([
    'purchase_agreement',
    'bill_of_lading',
    'export_certificate',
    'warehouse_receipt',
  ])
  docType: string;

  @IsString()
  @IsNotEmpty()
  ipfsHash: string;

  @IsString()
  @IsNotEmpty()
  storageUrl: string;
}
