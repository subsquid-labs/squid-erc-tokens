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
        const account = await this.store.getOrFail(Account, this.data.accountId)
        const token = await this.store.getOrFail(Token, this.data.tokenId)

        const balance = new TokenBalance({
            id: this.data.balanceId,
            account,
            token,
            value: 0n,
        })

        await this.store.insert(balance)
        this.log.debug(`Balance ${balance.id} created`)
    }
}

export interface ChangeData {
    /** @entity {TokenBalance} */
    balanceId: string
    amount: bigint
}

export class ChangeAction extends Action<ChangeData> {
    async perform() {
        const balance = await this.store.getOrFail(TokenBalance, this.data.balanceId)

        balance.value += this.data.amount

        this.log.debug(`Balance ${balance.id} changed by ${this.data.amount} (${balance.value})`)
        if (balance.value > 0) {
            await this.store.upsert(balance)
        } else {
            await this.store.remove(balance)
            this.log.debug(`Balance ${balance.id} destroyed`)
        }
    }
}
