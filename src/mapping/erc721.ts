import {StoreWithCache} from '@belopash/typeorm-store'
import {toChecksumAddress} from 'ethereum-checksum-address'
import * as erc721 from '../abi/erc721'
import {ZERO_ADDRESS} from '../constants'
import {Account, Contract, Token, TokenBalance, TokenStandard} from '../model'
import {Log} from '../processor'
import {createAccountId, createBalanceId, createContractId, createTokenId} from '../util'
import {Mapper} from './base'

export class ERC721TransferMapper extends Mapper<StoreWithCache, Log> {
    handle(log: Log) {
        const event = erc721.events.Transfer.decode(log)

        const contractAddress = toChecksumAddress(log.address)
        const contractId = createContractId(contractAddress)
        this.store.defer(Contract, contractId)

        const index = event.tokenId
        const tokenId = createTokenId(contractAddress, index)
        this.store.defer(Token, tokenId, {contract: true})

        const fromAddress = event.from
        const fromAccountId = createAccountId(fromAddress)
        const fromBalanceId = createBalanceId(fromAddress, contractAddress, index)
        this.store.defer(TokenBalance, fromBalanceId)
        this.store.defer(Account, fromAccountId)

        const toAddress = event.to
        const toAccountId = createAccountId(toAddress)
        const toBalanceId = createBalanceId(toAddress, contractAddress, index)
        this.store.defer(TokenBalance, toBalanceId)
        this.store.defer(Account, toAccountId)

        const amount = 1n

        this.queue.lazy(async () => {
            const token = await this.store.get(Token, tokenId)
            if (token == null) {
                const contract = await this.store.get(Contract, contractId)
                if (contract == null) {
                    this.queue.add('contract_create', {
                        contractId,
                        address: contractAddress,
                    })
                }

                this.queue.add('token_create', {
                    tokenId,
                    index,
                    contractId,
                    type: TokenStandard.ERC721,
                })
            }
        })

        this.queue
            .lazy(async () => {
                const account = await this.store.get(Account, fromAccountId)
                if (account == null) {
                    this.queue.add('account_create', {
                        accountId: fromAccountId,
                        address: fromAddress,
                    })
                }
            })
            .lazy(async () => {
                const account = await this.store.get(Account, toAccountId)
                if (account == null) {
                    this.queue.add('account_create', {
                        accountId: toAccountId,
                        address: toAddress,
                    })
                }
            })

        if (fromAddress === ZERO_ADDRESS) {
            this.queue.add('token_mint', {
                mintId: log.id,
                tokenId,
                amount,
            })
        } else {
            this.queue
                .lazy(async () => {
                    const token = await this.store.getOrFail(Token, tokenId)
                    if (token.supply === 0n) {
                        this.queue.add('token_mint', {
                            mintId: log.id,
                            tokenId,
                            amount,
                        })
                    }
                })
                .lazy(async () => {
                    const balance = await this.store.get(TokenBalance, fromBalanceId)
                    if (balance != null) {
                        this.queue.add('balance_change', {
                            balanceId: fromBalanceId,
                            amount: -amount,
                        })
                    }
                })
        }

        if (toAddress === ZERO_ADDRESS && fromAddress !== ZERO_ADDRESS) {
            this.queue.add('token_burn', {
                burnId: log.id,
                tokenId,
                amount,
            })
        } else {
            this.queue
                .lazy(async () => {
                    const balance = await this.store.get(TokenBalance, toBalanceId)
                    if (balance == null) {
                        this.queue.add('balance_create', {
                            balanceId: toBalanceId,
                            accountId: toAccountId,
                            tokenId,
                        })
                    }
                })
                .add('balance_change', {
                    balanceId: toBalanceId,
                    amount: 1n,
                })
        }

        this.queue.add('token_transfer', {
            transferId: log.id,
            fromId: fromAccountId,
            toId: toAccountId,
            tokenId,
            amount: 1n,
        })
    }
}
