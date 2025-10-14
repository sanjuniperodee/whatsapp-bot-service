import { Injectable } from '@nestjs/common';
import { Model, Transaction } from 'objection';
import { v4 as uuid } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export type TransactionId = string;

interface TransactionContext {
  transactionId: TransactionId;
  transaction: Transaction;
}

@Injectable()
export class UnitOfWork {
  private transactions: Map<TransactionId, Transaction> = new Map<TransactionId, Transaction>();
  private asyncLocalStorage = new AsyncLocalStorage<TransactionContext>();

  async start(): Promise<TransactionId> {
    const id: TransactionId = uuid();
    if (!this.transactions.has(id)) {
      const trx = await Model.startTransaction();
      this.transactions.set(id, trx);
    }

    return id;
  }

  async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const id = await this.start();
    const trx = this.getTrx(id);
    
    return this.asyncLocalStorage.run({ transactionId: id, transaction: trx }, fn);
  }

  getCurrentTransaction(): Transaction | null {
    const context = this.asyncLocalStorage.getStore();
    return context?.transaction || null;
  }

  getCurrentTransactionId(): TransactionId | null {
    const context = this.asyncLocalStorage.getStore();
    return context?.transactionId || null;
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
