import {StoreWithCache} from '@belopash/typeorm-store'
import {Log} from '../processor'
import {Mapper} from './base'
import {toChecksumAddress} from 'ethereum-checksum-address'
import {Token, TokenBalance, Account, TokenStandard, Contract} from '../model'
import {createContractId, createTokenId, createAccountId, createBalanceId} from '../util'
import * as erc20 from '../abi/erc20'
import {ZERO_ADDRESS} from '../constants'

export class ERC20TransferMapper extends Mapper<StoreWithCache, Log> {
    handle(log: Log) {
        const event = erc20.events.Transfer.decode(log)

        const contractAddress = toChecksumAddress(log.address)
        const contractId = createContractId(contractAddress)
        this.store.defer(Contract, contractId)

        const tokenId = createTokenId(contractAddress)
        this.store.defer(Token, tokenId, {contract: true})

        const fromAddress = event.from
        const fromAccountId = createAccountId(fromAddress)
        const fromBalanceId = createBalanceId(fromAddress, contractAddress)
        this.store.defer(TokenBalance, fromBalanceId)
        this.store.defer(Account, fromAccountId)

        const toAddress = event.to
        const toAccountId = createAccountId(toAddress)
        const toBalanceId = createBalanceId(toAddress, contractAddress)
        this.store.defer(TokenBalance, toBalanceId)
        this.store.defer(Account, toAccountId)

        const amount = event.value

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
                    contractId,
                    type: TokenStandard.ERC20,
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
            this.queue.lazy(async () => {
                const balance = await this.store.get(TokenBalance, fromBalanceId)
                if (balance != null) {
                    this.queue.add('balance_change', {
                        balanceId: fromBalanceId,
                        amount: -amount,
                    })
                }
            })
        }

        if (toAddress === ZERO_ADDRESS) {
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
                    amount,
                })
        }

        this.queue.add('token_transfer', {
            transferId: log.id,
            fromId: fromAccountId,
            toId: toAccountId,
            tokenId,
            amount,
        })
    }
}
