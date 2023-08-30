import {Account, Token, TokenBalance} from '../model'
import {Action} from './base'

export interface CreateData {
    /** @entity {TokenBalance} */
    balanceId: string
    /** @entity {Account} */
    accountId: string
    /** @entity {Token} */
    tokenId: string
}

export class CreateAction extends Action<CreateData> {
    async perform() {
        const account = await this.ctx.store.getOrFail(Account, this.data.accountId)
        const token = await this.ctx.store.getOrFail(Token, this.data.tokenId)

        const balance = new TokenBalance({
            id: this.data.balanceId,
            account,
            token,
            value: 0n,
        })

        await this.ctx.store.insert(balance)
        this.ctx.log.debug(`Balance ${balance.id} created`)
    }
}

export interface ChangeData {
    /** @entity {TokenBalance} */
    balanceId: string
    amount: bigint
}

export class ChangeAction extends Action<ChangeData> {
    async perform() {
        const balance = await this.ctx.store.getOrFail(TokenBalance, this.data.balanceId)

        balance.value += this.data.amount

        this.ctx.log.debug(`Balance ${balance.id} changed by ${this.data.amount} (${balance.value})`)
        if (balance.value > 0) {
            await this.ctx.store.upsert(balance)
        } else {
            await this.ctx.store.remove(balance)
            this.ctx.log.debug(`Balance ${balance.id} destroyed`)
        }
    }
}
