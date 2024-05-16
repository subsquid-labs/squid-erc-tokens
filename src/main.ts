import {TypeormDatabaseWithCache, StoreWithCache} from '@belopash/typeorm-store'
import * as erc721 from './abi/erc721'
import { handleErc20Transfer } from './mapping/erc20'
import { handleErc721Transfer } from './mapping/erc721'
import { processor, ProcessorContext } from './processor'
import { TaskQueue } from './utils/queue'

type MappingContext = ProcessorContext<StoreWithCache> & { queue: TaskQueue }

processor.run(new TypeormDatabaseWithCache({supportHotBlocks: true}), async ctx => {

    const mctx: MappingContext = {
        ...ctx,
        queue: new TaskQueue()
    }

    for (const block of ctx.blocks) {
        for (const log of block.logs) {
            switch (log.topics[0]) {
                case erc721.events.Transfer.topic: { // same as erc20.events.Transfer.topic, so we need to tell them apart
                    if (log.topics.length === 4) { // likely ERC721
                        handleErc721Transfer(mctx, log)
                    }
                    else if (log.topics.length === 3) { // likely ERC20
                        handleErc20Transfer(mctx, log)
                    }
                    else {
                        ctx.log.info(`Skipping a Transfer(address,address,uint256) event from ${log.address} not recognized as ERC20 or ERC721. Txn ${log.transactionHash}`)
                    }
                    break
                }
            }
        }
    }

    await mctx.queue.run()
})