import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QueueService } from './queue.service';
import { QUEUE_SERVICE } from './queue.constants';

export { QUEUE_SERVICE } from './queue.constants';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: QUEUE_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              config.get<string>(
                'RABBITMQ_URL',
                'amqp://guest:guest@localhost:5672',
              ),
            ],
            queue: 'agric_onchain_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [QueueService],
  exports: [QueueService, ClientsModule],
})
export class QueueModule {}
