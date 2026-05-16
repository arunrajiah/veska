import { processAllDue } from '../services/recurring-invoice.service.js';
import type { Database } from '@veska/core';

export function startRecurringInvoiceJob(db: Database): void {
  const run = async () => {
    try {
      const result = await processAllDue(db);
      if (result.processed > 0) {
        console.log(
          `[recurring-invoices] Processed ${result.processed} schedules, errors: ${result.errors}`,
        );
      }
    } catch (err) {
      console.error('[recurring-invoices] Error:', err);
    }
  };

  // Run once on startup then every hour
  void run();
  setInterval(() => void run(), 60 * 60 * 1000);
}
