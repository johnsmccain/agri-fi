import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { TradeDealsController } from './trade-deals.controller';
import { TradeDealsService } from './trade-deals.service';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';

const mockDeal = { id: 'deal-uuid', commodity: 'Cocoa', status: 'open' };

const mockService = {
  findOpen: jest.fn().mockResolvedValue([mockDeal]),
  findOne: jest.fn().mockResolvedValue(mockDeal),
};

describe('TradeDealsController (public access)', () => {
  let controller: TradeDealsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradeDealsController],
      providers: [{ provide: TradeDealsService, useValue: mockService }],
    })
      // Override OptionalJwtGuard to simulate unauthenticated request (user = null)
      .overrideGuard(OptionalJwtGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = null;
          return true;
        },
      })
      .compile();

    controller = module.get<TradeDealsController>(TradeDealsController);
  });

  describe('GET /trade-deals', () => {
    it('returns deals without authentication', async () => {
      const result = await controller.findOpen();
      expect(result).toEqual([mockDeal]);
    });
  });

  describe('GET /trade-deals/:id', () => {
    it('returns deal without authentication', async () => {
      const result = await controller.findOne('deal-uuid');
      expect(result).toEqual(mockDeal);
      expect(mockService.findOne).toHaveBeenCalledWith('deal-uuid');
    });

    it('returns deal with authenticated user (guard passes user through)', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [TradeDealsController],
        providers: [{ provide: TradeDealsService, useValue: mockService }],
      })
        .overrideGuard(OptionalJwtGuard)
        .useValue({
          canActivate: (ctx: ExecutionContext) => {
            ctx.switchToHttp().getRequest().user = {
              id: 'user-uuid',
              role: 'investor',
            };
            return true;
          },
        })
        .compile();

      const authedController =
        module.get<TradeDealsController>(TradeDealsController);
      const result = await authedController.findOne('deal-uuid');
      expect(result).toEqual(mockDeal);
    });
  });
});
