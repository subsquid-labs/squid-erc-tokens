import {DataHandlerContext, BlockHeader, Transaction} from '@subsquid/evm-processor'
import {StoreWithCache} from '@belopash/typeorm-store'

export type ActionContext = DataHandlerContext<StoreWithCache, {}>
export type ActionBlock = Pick<BlockHeader, 'hash' | 'height' | 'timestamp'>
export type ActionTransaction = Pick<Transaction, 'id' | 'hash'>

export type ActionData<A> = A extends Action<infer D> ? D : never

export interface ActionConstructor<A extends Action> {
    new (
        ctx: ActionContext,
        block: ActionBlock,
        transaction: ActionTransaction | undefined,
        data: A extends Action<infer R> ? R : never
    ): A
}

export abstract class Action<T = any> {
    constructor(
        readonly ctx: ActionContext,
        readonly block: ActionBlock,
        readonly transaction: ActionTransaction | undefined,
        readonly data: T
    ) {}

    abstract perform(): Promise<void>
}
