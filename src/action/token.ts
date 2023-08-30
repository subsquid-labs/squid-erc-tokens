import {Account, Burn, Contract, Mint, Token, TokenBalance, TokenStandard, Transfer} from '../model'
import {Action} from './base'

export interface CreateData {
    tokenId: string
    index?: bigint
    type: TokenStandard
    contractId: string
}

export class CreateAction extends Action<CreateData> {
    async perform() {
        const contract = await this.store.getOrFail(Contract, this.data.contractId)

        const token = new Token({
            id: this.data.tokenId,
            contract,
            index: this.data.index,
            type: this.data.type,
            supply: 0n,
        })

        await this.store.insert(token)

        this.log.debug(`Token ${token.id} created`)
    }
}

export interface TransferTokenData {
    transferId: string
    /**
     * @entity {Token}
     * @relations [contract]
     */
    tokenId: string
    /**
     * @entity {Account}
     */
    fromId: string
    /**
     * @entity {Account}
     */
    toId: string
    amount: bigint
}

export class TransferTokenAction extends Action<TransferTokenData> {
    async perform() {
        const token = await this.store.getOrFail(Token, this.data.tokenId, {contract: true})
        const from = await this.store.getOrFail(Account, this.data.fromId)
        const to = await this.store.getOrFail(Account, this.data.toId)

        const transfer = new Transfer({
            id: this.data.transferId,
            blockNumber: this.block.height,
            timestamp: new Date(this.block.timestamp),
            txnHash: this.transaction?.hash,
            token,
            contract: token.contract,
            from,
            to,
            amount: this.data.amount,
        })
        await this.store.insert(transfer)
    }
}

export interface MintTokenData {
    mintId: string
    tokenId: string
    amount: bigint
}

export class MintTokenAction extends Action<MintTokenData> {
    async perform() {
        const token = await this.store.getOrFail(Token, this.data.tokenId, {contract: true})
        const contract = token.contract

        token.supply += this.data.amount
        await this.store.upsert(token)

        contract.totalSupply += this.data.amount
        await this.store.upsert(contract)

        const burn = new Mint({
            id: this.data.mintId,
            blockNumber: this.block.height,
            timestamp: new Date(this.block.timestamp),
            txnHash: this.transaction?.hash,
            token,
            contract,
            amount: this.data.amount,
        })
        await this.store.insert(burn)

        this.log.debug(`Token ${token.id} burned`)
    }
}

export interface BurnTokenData {
    burnId: string
    tokenId: string
    amount: bigint
}

export class BurnTokenAction extends Action<BurnTokenData> {
    async perform() {
        const token = await this.store.getOrFail(Token, this.data.tokenId, {contract: true})
        const contract = token.contract

        token.supply -= this.data.amount
        await this.store.upsert(token)

        contract.totalSupply -= this.data.amount
        await this.store.upsert(contract)

        const burn = new Burn({
            id: this.data.burnId,
            blockNumber: this.block.height,
            timestamp: new Date(this.block.timestamp),
            txnHash: this.transaction?.hash,
            token,
            contract,
            amount: this.data.amount,
        })
        await this.store.insert(burn)

        this.log.debug(`Token ${token.id} burned`)
    }
}
