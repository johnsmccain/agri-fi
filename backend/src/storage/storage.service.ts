import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { randomUUID } from 'crypto';

export interface StorageResult {
  hash: string;
  url: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly ipfsGateway: string;
  private readonly ipfsToken: string;
  private readonly s3Bucket: string;
  private readonly s3Region: string;

  constructor(private readonly config: ConfigService) {
    this.ipfsGateway = config.get<string>(
      'IPFS_GATEWAY',
      'https://api.web3.storage',
    );
    this.ipfsToken = config.get<string>('IPFS_TOKEN', '');
    this.s3Bucket = config.get<string>('AWS_S3_BUCKET', '');
    this.s3Region = config.get<string>('AWS_REGION', 'us-east-1');

    this.s3 = new S3Client({
      region: this.s3Region,
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async upload(file: Buffer, mimeType: string): Promise<StorageResult> {
    try {
      return await this.uploadToIpfs(file, mimeType);
    } catch (ipfsErr) {
      this.logger.warn(
        `IPFS upload failed: ${ipfsErr.message}. Falling back to S3.`,
      );
    }

    try {
      return await this.uploadToS3(file, mimeType);
    } catch (s3Err) {
      this.logger.error(`S3 upload also failed: ${s3Err.message}`);
    }

    throw new ServiceUnavailableException(
      'File upload failed: both IPFS and S3 are unavailable.',
    );
  }

  async getUrl(hash: string): Promise<string> {
    // S3 keys contain '/' or start with a UUID pattern; CIDs start with 'Qm' or 'bafy'
    if (hash.startsWith('Qm') || hash.startsWith('bafy')) {
      return `${this.ipfsGateway}/ipfs/${hash}`;
    }
    return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${hash}`;
  }

  private async uploadToIpfs(
    file: Buffer,
    mimeType: string,
  ): Promise<StorageResult> {
    const response = await axios.post(`${this.ipfsGateway}/upload`, file, {
      headers: {
        Authorization: `Bearer ${this.ipfsToken}`,
        'Content-Type': mimeType,
      },
      maxBodyLength: Infinity,
    });

    const cid: string = response.data?.cid;
    if (!cid) {
      throw new Error('IPFS response did not include a CID.');
    }

    return {
      hash: cid,
      url: `${this.ipfsGateway}/ipfs/${cid}`,
    };
  }

  private async uploadToS3(
    file: Buffer,
    mimeType: string,
  ): Promise<StorageResult> {
    const key = `uploads/${randomUUID()}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    );

    return {
      hash: key,
      url: `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${key}`,
    };
  }
}
