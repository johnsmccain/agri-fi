# Escrow Release System Implementation

This document describes the implementation of the automated escrow release system that processes `deal.delivered` events and distributes payments to all stakeholders.

## Feature Overview

When a trade deal reaches "delivered" status, the system automatically:
1. Listens for `deal.delivered` queue events via RabbitMQ consumer
2. Releases escrow funds through Stellar blockchain payments
3. Records payment distribution details with transaction IDs
4. Transitions deal status to "completed"
5. Sends email notifications to all stakeholders
6. Handles failures with admin alerts and fund retention

## Implementation Details

### Requirements Addressed
- **6.5**: Deal status transitions to completed when all payments are successfully distributed
- **6.6**: On Stellar payment failure: log error, retain escrow funds, notify platform admin
- **6.7**: Notify farmer, trader, and all investors via email when deal is completed
- **6.8**: Each payment transaction's Stellar transaction ID is recorded for auditability

### Architecture Components

#### 1. EscrowConsumer (`backend/src/escrow/escrow.consumer.ts`)
- **RabbitMQ Integration**: Subscribes to `deal.delivered` queue events
- **Retry Logic**: Up to 3 attempts with exponential backoff for transient errors
- **Error Classification**: Distinguishes between transient and permanent failures
- **Graceful Degradation**: Prevents infinite requeuing on permanent failures

#### 2. EscrowService (`backend/src/escrow/escrow.service.ts`)
- **Transaction Orchestration**: Manages the complete escrow release process
- **Database Atomicity**: All operations within a single database transaction
- **Payment Distribution**: Creates detailed records for each recipient
- **Notification Management**: Enqueues email notifications for all stakeholders
- **Failure Handling**: Comprehensive error handling with admin alerts

#### 3. PaymentDistribution Entity (`backend/src/escrow/entities/payment-distribution.entity.ts`)
- **Audit Trail**: Records every payment with Stellar transaction IDs
- **Recipient Tracking**: Links payments to specific users and wallet addresses
- **Status Management**: Tracks confirmed/failed payment states

## Business Logic Flow

```
1. deal.delivered event received
2. Load trade deal and validate status = 'delivered'
3. Load confirmed investments with investor wallet addresses
4. Validate all required wallet addresses exist
5. Within database transaction:
   a. Call StellarService.releaseEscrow()
   b. Create payment distribution records:
      - Farmer: 98% of total value
      - Each investor: proportional share
      - Platform: 2% of total value
   c. Update deal status to 'completed'
6. Enqueue email notifications (outside transaction)
7. On failure: mark payments as failed, send admin alert
```

## Payment Distribution Structure

### Farmer Payment
- **Amount**: 98% of total deal value
- **Recipient Type**: `farmer`
- **Recipient ID**: Farmer's user ID
- **Wallet**: Farmer's linked Stellar wallet address

### Investor Payments
- **Amount**: Proportional to token holdings `(tokenAmount / totalTokens) * totalValue`
- **Recipient Type**: `investor`
- **Recipient ID**: Investor's user ID
- **Wallet**: Investor's linked Stellar wallet address

### Platform Fee
- **Amount**: 2% of total deal value
- **Recipient Type**: `platform`
- **Recipient ID**: `null`
- **Wallet**: Platform's configured wallet address

## Error Handling Strategy

### Transient Errors (Retry with Backoff)
- Stellar network connectivity issues
- Database connection problems
- Timeout errors
- Horizon API temporary failures

### Permanent Errors (No Retry)
- Missing wallet addresses
- Deal not found
- Invalid deal status
- Configuration errors

### Failure Recovery
1. **Log Error**: Detailed error logging with deal ID and failure reason
2. **Retain Funds**: Escrow funds remain locked in Stellar account
3. **Mark Failed**: Payment distribution records marked as `failed`
4. **Admin Alert**: Immediate notification to platform administrators
5. **No Status Change**: Deal remains in `delivered` status for manual intervention

## Database Schema

### payment_distributions Table
```sql
CREATE TABLE "payment_distributions" (
  "id"              UUID PRIMARY KEY,
  "trade_deal_id"   UUID NOT NULL REFERENCES trade_deals(id),
  "recipient_type"  TEXT NOT NULL CHECK (recipient_type IN ('farmer', 'investor', 'platform')),
  "recipient_id"    UUID NULL REFERENCES users(id),
  "wallet_address"  TEXT NOT NULL,
  "amount_usd"      NUMERIC NOT NULL,
  "stellar_tx_id"   TEXT NULL,
  "status"          TEXT NOT NULL DEFAULT 'confirmed',
  "created_at"      TIMESTAMP DEFAULT NOW()
);
```

## Queue Integration

### Consumed Events
- **Pattern**: `deal.delivered`
- **Payload**: `{ tradeDealId: string }`
- **Source**: ShipmentsService (when importer milestone recorded)

### Produced Events
- **Email Notifications**: `email.notification` with recipient-specific details
- **Admin Alerts**: `admin.alert` for escrow failures

## Email Notification Details

### Farmer Notification
```json
{
  "type": "deal_completed",
  "recipient": "farmer",
  "userId": "farmer-id",
  "dealId": "deal-id",
  "dealDetails": {
    "commodity": "Cocoa",
    "totalValue": 10000,
    "farmerAmount": 9800
  }
}
```

### Trader Notification
```json
{
  "type": "deal_completed",
  "recipient": "trader",
  "userId": "trader-id",
  "dealId": "deal-id",
  "dealDetails": {
    "commodity": "Cocoa",
    "totalValue": 10000
  }
}
```

### Investor Notification
```json
{
  "type": "deal_completed",
  "recipient": "investor",
  "userId": "investor-id",
  "dealId": "deal-id",
  "dealDetails": {
    "commodity": "Cocoa",
    "totalValue": 10000,
    "investmentAmount": 5000,
    "returnAmount": 5000,
    "tokenAmount": 50
  }
}
```

## Configuration Requirements

### Environment Variables
- `STELLAR_PLATFORM_WALLET`: Platform's Stellar wallet address for fee collection
- `STELLAR_PLATFORM_SECRET`: Platform's Stellar secret key (fallback for wallet address)

## Testing Strategy

### Unit Tests (`backend/src/escrow/escrow.service.spec.ts`)
- **Successful Processing**: Verifies complete escrow release flow
- **Stellar Failures**: Tests error handling and admin alerts
- **Status Validation**: Ensures only delivered deals are processed
- **Payment Calculations**: Validates correct amount distributions

### Integration Testing
1. Create funded deal with confirmed investments
2. Record importer milestone (triggers `deal.delivered`)
3. Verify escrow release and payment distributions
4. Confirm deal status changed to `completed`
5. Validate email notifications sent

## Monitoring and Observability

### Logging Events
- **Event Received**: `Received deal.delivered event for deal {id}`
- **Processing Success**: `Deal {id} completed successfully. Stellar TX: {txId}`
- **Retry Attempts**: `Transient error processing deal {id} (attempt {n}/{max})`
- **Failure Alerts**: `Escrow release failed for deal {id}: {error}`
- **Admin Notifications**: `Admin alert sent for failed escrow release: {id}`

### Metrics to Monitor
- Escrow release success rate
- Average processing time
- Retry attempt frequency
- Admin alert frequency
- Payment distribution accuracy

## Security Considerations

- **Escrow Secret Protection**: Secrets stored encrypted in database
- **Transaction Atomicity**: Prevents partial payment states
- **Wallet Validation**: Ensures all recipients have valid addresses
- **Audit Trail**: Complete payment history with blockchain references
- **Admin Oversight**: Failed releases require manual intervention

## Future Enhancements

1. **Multi-Currency Support**: Extend beyond XLM to USDC/other assets
2. **Partial Release**: Support for milestone-based partial payments
3. **Fee Customization**: Configurable platform fee percentages
4. **Advanced Retry**: More sophisticated retry strategies
5. **Real-time Notifications**: WebSocket updates for stakeholders
6. **Compliance Reporting**: Enhanced audit and compliance features

## Dependencies

This implementation depends on:
- **Task 14**: StellarService.releaseEscrow method
- **Task 10**: deal.delivered job publisher from milestone system
- **Task 9**: Confirmed investments with wallet addresses
- **RabbitMQ**: Message queue infrastructure
- **Stellar Network**: Blockchain payment processing

The system provides a robust, auditable, and fault-tolerant approach to automated escrow release with comprehensive stakeholder notifications.