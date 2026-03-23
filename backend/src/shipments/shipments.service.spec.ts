import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ShipmentsService } from './shipments.service';
import { ShipmentMilestone } from './entities/shipment-milestone.entity';
import { StellarService } from '../stellar/stellar.service';
import { QueueService } from '../queue/queue.service';
import { ConfigService } from '@nestjs/config';
import { CreateMilestoneDto } from './dto/create-milestone.dto';

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let mockMilestoneRepo: jest.Mocked<Repository<ShipmentMilestone>>;
  let mockStellarService: jest.Mocked<StellarService>;
  let mockQueueService: jest.Mocked<QueueService>;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const mockManager = {
      query: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb: (m: typeof mockManager) => Promise<unknown>) => cb(mockManager)),
    } as any;

    mockMilestoneRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      manager: mockManager,
    } as any;

    mockStellarService = {
      recordMemo: jest.fn(),
    } as any;

    mockQueueService = {
      enqueueDealDelivered: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        {
          provide: getRepositoryToken(ShipmentMilestone),
          useValue: mockMilestoneRepo,
        },
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ShipmentsService>(ShipmentsService);
  });

  describe('recordMilestone - Importer Milestone', () => {
    it('should transition deal to delivered and enqueue job when recording importer milestone', async () => {
      const userId = 'trader-123';
      const tradeDealId = 'deal-456';
      const dto: CreateMilestoneDto = {
        trade_deal_id: tradeDealId,
        milestone: 'importer',
        notes: 'Goods received by importer',
      };

      const mockDeal = {
        id: tradeDealId,
        status: 'funded',
        trader_id: userId,
        escrow_secret_key: 'test-escrow-secret',
      };

      const mockManager = {
        query: jest.fn()
          .mockResolvedValueOnce([mockDeal])   // SELECT deal
          .mockResolvedValueOnce(undefined),    // UPDATE status
        find: jest.fn().mockResolvedValue([
          { milestone: 'farm' },
          { milestone: 'warehouse' },
          { milestone: 'port' },
        ]),
        create: jest.fn().mockReturnValue({
          tradeDealId,
          milestone: 'importer',
          recordedBy: userId,
          notes: dto.notes,
          stellarTxId: 'stellar-tx-123',
        }),
        save: jest.fn().mockResolvedValue({
          id: 'milestone-789',
          tradeDealId,
          milestone: 'importer',
          recordedBy: userId,
          notes: dto.notes,
          stellarTxId: 'stellar-tx-123',
        }),
      };

      (mockDataSource.transaction as jest.Mock).mockImplementation(
        (cb: (m: typeof mockManager) => Promise<unknown>) => cb(mockManager),
      );
      mockStellarService.recordMemo.mockResolvedValue('stellar-tx-123');

      const result = await service.recordMilestone(userId, dto);

      expect(result).toBeDefined();
      expect(result.milestone).toBe('importer');

      expect(mockManager.query).toHaveBeenCalledWith(
        `UPDATE trade_deals SET status = 'delivered' WHERE id = $1`,
        [tradeDealId],
      );

      expect(mockQueueService.enqueueDealDelivered).toHaveBeenCalledWith(tradeDealId);
    });

    it('should not trigger status change for non-importer milestones', async () => {
      const userId = 'trader-123';
      const tradeDealId = 'deal-456';
      const dto: CreateMilestoneDto = {
        trade_deal_id: tradeDealId,
        milestone: 'warehouse',
        notes: 'Goods at warehouse',
      };

      const mockDeal = {
        id: tradeDealId,
        status: 'funded',
        trader_id: userId,
        escrow_secret_key: 'test-escrow-secret',
      };

      const mockManager = {
        query: jest.fn().mockResolvedValueOnce([mockDeal]),
        find: jest.fn().mockResolvedValue([{ milestone: 'farm' }]),
        create: jest.fn().mockReturnValue({
          tradeDealId,
          milestone: 'warehouse',
          recordedBy: userId,
          notes: dto.notes,
          stellarTxId: 'stellar-tx-123',
        }),
        save: jest.fn().mockResolvedValue({
          id: 'milestone-789',
          tradeDealId,
          milestone: 'warehouse',
          recordedBy: userId,
          notes: dto.notes,
          stellarTxId: 'stellar-tx-123',
        }),
      };

      (mockDataSource.transaction as jest.Mock).mockImplementation(
        (cb: (m: typeof mockManager) => Promise<unknown>) => cb(mockManager),
      );
      mockStellarService.recordMemo.mockResolvedValue('stellar-tx-123');

      const result = await service.recordMilestone(userId, dto);

      // Verify the milestone was created
      expect(result).toBeDefined();
      expect(result.milestone).toBe('warehouse');

      // Verify no status update was made
      expect(mockManager.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE trade_deals SET status'),
        expect.any(Array),
      );

      // Verify no job was enqueued
      expect(mockQueueService.enqueueDealDelivered).not.toHaveBeenCalled();
    });
  });
});