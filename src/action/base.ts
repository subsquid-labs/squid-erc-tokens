import {BlockHeader, Transaction} from '@subsquid/evm-processor'
import {StoreWithCache} from '@belopash/typeorm-store'
import {Logger} from '@subsquid/logger'

export type ActionBlock = Pick<BlockHeader, 'hash' | 'height' | 'timestamp'>
export type ActionTransaction = Pick<Transaction, 'id' | 'hash'>

export interface ActionConfig {
    store: StoreWithCache
    log: Logger
    block: ActionBlock
    transaction?: ActionTransaction
}

export abstract class Action<T> {
    constructor(protected config: ActionConfig, readonly data: T) {}

    protected get log() {
        return this.config.log
    }

    protected get store() {
        return this.config.store
    }

    get block() {
        return this.config.block
    }

    get transaction() {
        return this.config.transaction
    }

    abstract perform(): Promise<void>
}

export interface ActionConstructor<T = any> {
    new (...args: ConstructorParameters<typeof Action<T>>): Action<T>
}

export type BaseActionRegistry = {[k: string]: ActionConstructor}
