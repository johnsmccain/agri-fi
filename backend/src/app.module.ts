import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from './database/database.config';
import { AuthModule } from './auth/auth.module';
import { StellarModule } from './stellar/stellar.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { TradeDealsModule } from './trade-deals/trade-deals.module';
import { UsersModule } from './users/users.module';
import { InvestmentsModule } from './investments/investments.module';
import { EscrowModule } from './escrow/escrow.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { QueueProcessorModule } from './queue/queue-processor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
    }),
    AuthModule,
    StellarModule,
    ShipmentsModule,
    TradeDealsModule,
    UsersModule,
    InvestmentsModule,
    EscrowModule,
    StorageModule,
    DocumentsModule,
    QueueProcessorModule,
  ],
})
export class AppModule {}
