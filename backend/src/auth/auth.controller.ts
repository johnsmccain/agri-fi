import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletDto } from './dto/wallet.dto';
import { KycDto } from './dto/kyc.dto';
import { User } from './entities/user.entity';

interface AuthRequest extends Request {
  user: User;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('wallet')
  linkWallet(@Request() req: AuthRequest, @Body() dto: WalletDto) {
    return this.authService.linkWallet(req.user.id, dto.walletAddress);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('kyc')
  submitKyc(@Request() req: AuthRequest, @Body() dto: KycDto) {
    return this.authService.submitKyc(req.user.id, dto);
  }
}
