import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { KycDto } from './dto/kyc.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ id: string; email: string; role: string; kycStatus: string }> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: 'Email is already registered.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      country: dto.country,
      kycStatus: 'pending',
    });

    const saved = await this.userRepo.save(user);
    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      kycStatus: saved.kycStatus,
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials.');

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken: token };
  }

  async linkWallet(
    userId: string,
    walletAddress: string,
  ): Promise<{ walletAddress: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    user.walletAddress = walletAddress;
    await this.userRepo.save(user);
    return { walletAddress };
  }

  async submitKyc(
    userId: string,
    _dto: KycDto,
  ): Promise<{ kycStatus: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    user.kycStatus = 'verified';
    await this.userRepo.save(user);

    // Email notification would be triggered here via a queue/mailer service
    // For MVP, we log the intent
    console.log(`KYC verified for user ${user.email} — notification queued.`);

    return { kycStatus: user.kycStatus };
  }
}
