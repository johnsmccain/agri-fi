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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { KycGuard } from '../auth/kyc.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('investments')
@ApiBearerAuth('jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an investment (investor only)' })
  @ApiResponse({
    status: 201,
    description: 'Investment created, returns unsigned Stellar XDR',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only investors can create investments',
  })
  @ApiResponse({ status: 404, description: 'Trade deal not found' })
  @ApiResponse({ status: 409, description: 'Deal already fully funded' })
  @UseGuards(KycGuard, RolesGuard)
  @Roles('investor')
  async createInvestment(
    @Request() req: { user: { id: string; role: string } },
    @Body() createInvestmentDto: CreateInvestmentDto,
  ) {
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
  @ApiOperation({
    summary: 'Initiate escrow funding for an investment (investor only)',
  })
  @ApiParam({ name: 'id', description: 'Investment UUID' })
  @ApiBody({
    schema: {
      properties: {
        investorWalletAddress: {
          type: 'string',
          example: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Escrow funding initiated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only investors can fund investments',
  })
  @ApiResponse({ status: 404, description: 'Investment not found' })
  @UseGuards(RolesGuard)
  @Roles('investor')
  async fundEscrow(
    @Request() req: { user: { id: string; role: string } },
    @Param('id') id: string,
    @Body('investorWalletAddress') investorWalletAddress: string,
  ) {
    if (req.user.role !== 'investor') {
      throw new Error('Only investors can fund investments.');
    }
    return this.investmentsService.fundEscrow(id, investorWalletAddress);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm investment by submitting signed Stellar XDR',
  })
  @ApiParam({ name: 'id', description: 'Investment UUID' })
  @ApiBody({
    schema: {
      properties: { stellarTxId: { type: 'string', example: 'abc123...' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Investment confirmed on-chain' })
  @ApiResponse({ status: 400, description: 'Invalid transaction' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Investment not found' })
  async confirmInvestment(
    @Param('id') id: string,
    @Body('stellarTxId') stellarTxId: string,
  ) {
    return this.investmentsService.confirmInvestment(id, stellarTxId);
  }

  @Get('trade-deal/:tradeDealId')
  @ApiOperation({ summary: 'List all investments for a trade deal' })
  @ApiParam({ name: 'tradeDealId', description: 'Trade deal UUID' })
  @ApiResponse({ status: 200, description: 'List of investments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Trade deal not found' })
  async getInvestmentsByTradeDeal(@Param('tradeDealId') tradeDealId: string) {
    return this.investmentsService.getInvestmentsByTradeDeal(tradeDealId);
  }

  @Get('my-investments')
  @ApiOperation({ summary: "List the authenticated investor's investments" })
  @ApiResponse({ status: 200, description: 'List of investments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyInvestments(@Request() req: { user: { id: string } }) {
    return this.investmentsService.getInvestmentsByInvestor(req.user.id);
  }
}
