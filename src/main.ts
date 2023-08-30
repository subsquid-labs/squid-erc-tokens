import {TypeormDatabaseWithCache} from '@belopash/typeorm-store'
import {Logger} from '@subsquid/logger'
import {withErrorContext} from '@subsquid/util-internal'
import * as erc20 from './abi/erc20'
import * as erc721 from './abi/erc721'
import {ActionQueue} from './action/actionQueue'
import {ERC20TransferMapper, ERC721TransferMapper, Mapper, MapperConstructor} from './mapping'
import {processor} from './processor'

processor.run(new TypeormDatabaseWithCache({supportHotBlocks: true}), async (ctx) => {
    const queue = new ActionQueue({
        log: ctx.log,
        store: ctx.store,
    })

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
                        handler.as(ERC721TransferMapper).handle(log)
                    } catch (e) {
                        const isDecodingError = e instanceof RangeError
                        if (!isDecodingError) throw e

                        try {
                            handler.as(ERC20TransferMapper).handle(log)
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

class Handler<Store> {
    constructor(
        protected config: {
            log: Logger
            store: Store
            queue: ActionQueue
        }
    ) {}

    private mappers: Map<MapperConstructor<Store, any>, Mapper<Store, any>> = new Map()

    as<Item>(mapperConstructor: MapperConstructor<Store, Item>) {
        let mapper = this.mappers.get(mapperConstructor)
        if (mapper == null) {
            mapper = new mapperConstructor(this.config)
            this.mappers.set(mapperConstructor, mapper)
        }
        return mapper
    }
}
