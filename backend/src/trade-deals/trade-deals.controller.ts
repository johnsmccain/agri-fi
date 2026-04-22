import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TradeDealsService } from './trade-deals.service';
import { TradeDeal } from './entities/trade-deal.entity';
import { User } from '../auth/entities/user.entity';
import { KycGuard } from '../auth/kyc.guard';
import { CreateTradeDealDto } from './dto/create-trade-deal.dto';

interface AuthRequest extends Request {
  user: User;
}

@Controller('trade-deals')
export class TradeDealsController {
  constructor(private readonly tradeDealsService: TradeDealsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), KycGuard)
  async createDeal(
    @Request() req: AuthRequest,
    @Body() dto: CreateTradeDealDto,
  ): Promise<TradeDeal> {
    if (req.user.role !== 'trader') {
      throw new ForbiddenException({
        code: 'ROLE_REQUIRED',
        message: 'Only traders can create trade deals.',
      });
    }

    return this.tradeDealsService.createDeal(req.user.id, dto);
  }

  @Get()
  async findOpen(
    @Query('commodity') commodity?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    return this.tradeDealsService.findOpen({
      commodity,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string): Promise<any> {
    return this.tradeDealsService.findOne(id);
  }
}
