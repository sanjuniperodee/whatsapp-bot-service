import { Injectable } from '@nestjs/common';
import { Model, Transaction } from 'objection';
import { v4 as uuid } from 'uuid';

export type TransactionId = string;

@Injectable()
export class UnitOfWork {
  private transactions: Map<TransactionId, Transaction> = new Map<TransactionId, Transaction>();

  async start(): Promise<TransactionId> {
    const id: TransactionId = uuid();
    if (!this.transactions.has(id)) {
      const trx = await Model.startTransaction();

      this.transactions.set(id, trx);
    }

    return id;
  }

  async execute(id: TransactionId) {
    const trx = this.transactions.get(id);

    if (!trx) {
      throw new Error('Transaction not found');
    }

    try {
      await trx.commit();
      await trx.executionPromise;
    } catch (e) {
      await this.rollback(id);
      throw e;
    } finally {
      this.finish(id);
    }
  }

  async rollback(id: TransactionId) {
    const trx = this.transactions.get(id);

    if (trx) {
      await trx.rollback();

      this.finish(id);
    }
  }

  async commit(id: TransactionId) {
    const trx = this.getTrx(id);

    try {
      await trx.commit();
      await trx.executionPromise;
    } catch (e) {
      await this.rollback(id);
    }
  }

  getTrx(id: TransactionId) {
    const trx = this.transactions.get(id);

    if (!trx) {
      throw new Error('Transaction not found');
    }

    return trx;
  }

  private finish(id: TransactionId) {
    this.transactions.delete(id);
  }
}
