import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

const mockUser = (): User => ({
  id: 'uuid-1',
  email: 'farmer@example.com',
  passwordHash: '',
  role: 'farmer',
  country: 'NG',
  kycStatus: 'pending',
  walletAddress: null,
  createdAt: new Date(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    userRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates a user with pending KYC', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const user = {
        ...mockUser(),
        passwordHash: await bcrypt.hash('password1', 10),
      };
      userRepo.create.mockReturnValue(user);
      userRepo.save.mockResolvedValue(user);

      const result = await service.register({
        name: 'Test Farmer',
        email: 'farmer@example.com',
        password: 'password1',
        role: 'farmer',
        country: 'NG',
      });

      expect(result.kycStatus).toBe('pending');
      expect(result.email).toBe('farmer@example.com');
    });

    it('throws ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue(mockUser());

      await expect(
        service.register({
          name: 'Dup',
          email: 'farmer@example.com',
          password: 'password1',
          role: 'farmer',
          country: 'NG',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns access token for valid credentials', async () => {
      const hash = await bcrypt.hash('secret123', 10);
      userRepo.findOne.mockResolvedValue({ ...mockUser(), passwordHash: hash });

      const result = await service.login({
        email: 'farmer@example.com',
        password: 'secret123',
      });
      expect(result.accessToken).toBe('token');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      userRepo.findOne.mockResolvedValue({ ...mockUser(), passwordHash: hash });

      await expect(
        service.login({ email: 'farmer@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('linkWallet', () => {
    it('updates wallet address', async () => {
      const user = mockUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, walletAddress: 'GABC123' });

      const result = await service.linkWallet('uuid-1', 'GABC123');
      expect(result.walletAddress).toBe('GABC123');
    });
  });

  describe('submitKyc', () => {
    it('sets kycStatus to verified', async () => {
      const user = mockUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, kycStatus: 'verified' });

      const result = await service.submitKyc('uuid-1', {
        docType: 'purchase_agreement',
        ipfsHash: 'Qm123',
        storageUrl: 'https://ipfs.io/ipfs/Qm123',
      });

      expect(result.kycStatus).toBe('verified');
    });
  });
});
