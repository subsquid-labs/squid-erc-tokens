import {StoreWithCache, TypeormDatabaseWithCache} from '@belopash/typeorm-store'
import {Logger} from '@subsquid/logger'
import {toChecksumAddress} from 'ethereum-checksum-address'
import * as erc721 from './abi/erc721'
import * as erc20 from './abi/erc20'
import {ActionQueue} from './action/actionQueue'
import {Account, Contract, Token, TokenBalance, TokenStandard} from './model'
import {Log, processor} from './processor'
import {createAccountId, createBalanceId, createContractId, createTokenId} from './util'
import {withErrorContext} from '@subsquid/util-internal'

const ERC721_INTERFACE_ID = '0x80ac58cd'
const ERC20_INTERFACE_ID = '0x36372b07'
const ERC1155_INTERFACE_ID = '0xd9b67a26'

processor.run(new TypeormDatabaseWithCache({supportHotBlocks: true}), async (ctx) => {
    const queue = new ActionQueue().setContext(ctx)
    const handler = new Handler({
        queue,
        log: ctx.log,
        store: ctx.store,
    })

    for (const block of ctx.blocks) {
        queue.setBlock(block.header)
        for (const log of block.logs) {
            queue.setTransaction(log.transaction)
            switch (log.topics[0]) {
                case erc20.events.Transfer.topic:
                case erc721.events.Transfer.topic: {
                    try {
                        handler.use(ERC721TransferMapper).handle(log)
                    } catch (e) {
                        const isDecodingError = e instanceof RangeError
                        if (!isDecodingError) throw e

                        try {
                            handler.use(ERC20TransferMapper).handle(log)
                        } catch (e: any) {
                            const isDecodingError = e instanceof RangeError
                            if (!isDecodingError)
                                withErrorContext({
                                    block: block.header.height,
                                    txHash: log.transactionHash,
                                    log: log.logIndex,
                                })(e)
                        }
                    }
                    break
                }
            }
        }
        if (queue.size >= 300_000) {
            await queue.process()
            await ctx.store.flush()
            ctx.log.info('saved')
        }
    }

    await queue.process()
    await ctx.store.flush()
})

class Handler {
    constructor(
        protected opts: {
            log: Logger
            store: StoreWithCache
            queue: ActionQueue
        }
    ) {}

    protected get log() {
        return this.opts.log
    }

    protected get store() {
        return this.opts.store
    }

    protected get queue() {
        return this.opts.queue
    }

    private mappers: Map<MapperConstructor<any>, Mapper<any>> = new Map()

    use<Item>(mapperConstructor: MapperConstructor<Item>) {
        let mapper = this.mappers.get(mapperConstructor)
        if (mapper == null) {
            mapper = new mapperConstructor(this.opts)
            this.mappers.set(mapperConstructor, mapper)
        }
        return mapper
    }
}

interface MapperConstructor<Item> {
    new (...args: ConstructorParameters<typeof Mapper>): Mapper<Item>
}

abstract class Mapper<Item> {
    constructor(
        protected opts: {
            log: Logger
            store: StoreWithCache
            queue: ActionQueue
        }
    ) {}

    protected get log() {
        return this.opts.log
    }

    protected get store() {
        return this.opts.store
    }

    protected get queue() {
        return this.opts.queue
    }

    abstract handle(item: Item): void
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export class ERC20TransferMapper extends Mapper<Log> {
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

export class ERC721TransferMapper extends Mapper<Log> {
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
