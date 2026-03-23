import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentDistributions1700000007 implements MigrationInterface {
  name = 'CreatePaymentDistributions1700000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_distributions" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "trade_deal_id"   UUID NOT NULL REFERENCES trade_deals(id),
        "recipient_type"  TEXT NOT NULL CHECK (recipient_type IN ('farmer', 'investor', 'platform')),
        "recipient_id"    UUID NULL REFERENCES users(id),
        "wallet_address"  TEXT NOT NULL,
        "amount_usd"      NUMERIC NOT NULL,
        "stellar_tx_id"   TEXT NULL,
        "status"          TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'failed')),
        "created_at"      TIMESTAMP DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_payment_distributions_trade_deal_id" ON "payment_distributions" ("trade_deal_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_payment_distributions_recipient_type" ON "payment_distributions" ("recipient_type");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_payment_distributions_stellar_tx_id" ON "payment_distributions" ("stellar_tx_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_distributions"`);
  }
}