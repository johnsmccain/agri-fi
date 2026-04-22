import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  async createInvestment(
    @Request() req: { user: { id: string; role: string } },
    @Body() createInvestmentDto: CreateInvestmentDto,
  ) {
    // Only investors can create investments
    if (req.user.role !== 'investor') {
      throw new Error('Only investors can create investments.');
    }

    return this.investmentsService.createInvestment(
      req.user.id,
      createInvestmentDto,
    );
  }

  @Post(':id/fund')
  @HttpCode(HttpStatus.OK)
  async fundEscrow(
    @Request() req: { user: { id: string; role: string } },
    @Param('id') id: string,
    @Body('investorWalletAddress') investorWalletAddress: string,
  ) {
    // Only investors can fund their own investments
    if (req.user.role !== 'investor') {
      throw new Error('Only investors can fund investments.');
    }

    return this.investmentsService.fundEscrow(id, investorWalletAddress);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmInvestment(
    @Param('id') id: string,
    @Body('stellarTxId') stellarTxId: string,
  ) {
    return this.investmentsService.confirmInvestment(id, stellarTxId);
  }

  @Get('trade-deal/:tradeDealId')
  async getInvestmentsByTradeDeal(@Param('tradeDealId') tradeDealId: string) {
    return this.investmentsService.getInvestmentsByTradeDeal(tradeDealId);
  }

  @Get('my-investments')
  async getMyInvestments(@Request() req: { user: { id: string } }) {
    return this.investmentsService.getInvestmentsByInvestor(req.user.id);
  }
}
