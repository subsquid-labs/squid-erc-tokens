import {withErrorContext} from '@subsquid/util-internal'
import assert from 'assert'
import {Action, ActionBlock, ActionConstructor, ActionContext, ActionData, ActionTransaction} from './base'
import * as Account from './account'
import * as Contract from './collection'
import * as Token from './token'
import * as Balance from './balance'

const Actions = {
    account_create: Account.CreateAction,

    contract_create: Contract.CreateAction,

    token_create: Token.CreateAction,
    token_transfer: Token.TransferTokenAction,
    token_mint: Token.MintTokenAction,
    token_burn: Token.BurnTokenAction,

    balance_create: Balance.CreateAction,
    balance_change: Balance.ChangeAction,
}

type CreateActionRegistry<T extends {[k: string]: ActionConstructor<Action<any>>}> = {
    [K in keyof T]: T[K] extends ActionConstructor<infer A> ? A : never
}
type ActionRegistry = CreateActionRegistry<typeof Actions>

export class ActionQueue {
    private actions: Action[] = []

    private ctx: ActionContext | undefined
    private block: ActionBlock | undefined
    private transaction: ActionTransaction | undefined

    get size() {
        return this.actions.length
    }

    setContext(ctx: ActionContext) {
        this.ctx = ctx

        return this
    }

    setBlock(block: ActionBlock) {
        this.block = block

        return this
    }

    setTransaction(transaction: ActionTransaction | undefined) {
        this.transaction = transaction

        return this
    }

    add<A extends keyof ActionRegistry>(action: A, data: ActionData<ActionRegistry[A]>): this {
        assert(this.ctx != null)
        assert(this.block != null)

        const a = new Actions[action](this.ctx, this.block, this.transaction, data as any) // TODO: find if there is a proper way to pass typed parameter
        this.actions.push(a)

        return this
    }

    lazy(cb: () => void | PromiseLike<void>) {
        assert(this.ctx != null)
        assert(this.block != null)

        const a = new LazyAction(this.ctx, this.block, this.transaction, cb)
        this.actions.push(a)

        return this
    }

    async process() {
        await this.processActions(this.actions)
        this.actions = []
    }

    private async processActions(actions: Action[]) {
        for (const action of actions) {
            await this.processAction(action).catch(
                withErrorContext({
                    block: action.block.height,
                    extrinsicHash: action.transaction?.hash,
                })
            )
        }
    }

    private async processAction(action: Action) {
        if (action instanceof LazyAction) {
            await this.processLazyAction(action)
        } else {
            await action.perform()
        }
    }

    private async processLazyAction(action: LazyAction) {
        const saved = {block: this.block, transaction: this.transaction, actions: this.actions}
        try {
            this.block = action.block
            this.transaction = action.transaction
            this.actions = []
            await action.perform()
            await this.processActions(this.actions)
        } finally {
            this.block = saved.block
            this.transaction = saved.transaction
            this.actions = saved.actions
        }
    }
}

class LazyAction extends Action<unknown> {
    constructor(
        readonly ctx: ActionContext,
        readonly block: ActionBlock,
        readonly transaction: ActionTransaction | undefined,
        readonly cb: () => void | PromiseLike<void>
    ) {
        super(ctx, block, transaction, {})
    }

    async perform(): Promise<void> {
        await this.cb()
    }
}
