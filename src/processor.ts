import assert from 'assert'
import {
    BlockHeader,
    DataHandlerContext,
    EvmBatchProcessor,
    EvmBatchProcessorFields,
    Log as _Log,
    Transaction as _Transaction,
} from '@subsquid/evm-processor'
import * as erc721 from './abi/erc721'
import * as erc20 from './abi/erc20'

assert(erc20.events.Transfer.topic===erc721.events.Transfer.topic, 'ERC20 and ERC721 topics are expected to be the same in the TS ABI and they are not')

export const processor = new EvmBatchProcessor()
    .setGateway('https://v2.archive.subsquid.io/network/moonriver-mainnet')
    .setRpcEndpoint({
        url: 'https://moonriver-rpc.dwellir.com',
        rateLimit: 50 // requests per second
    })
    // most networks will need a higher value here
    // e.g. Polygon needs at least 400 blocks to finality
    .setFinalityConfirmation(5)
    .setFields({
        log: {
            address: true,
            data: true,
            topics: true,
            transactionHash: true,
        },
    })
    .addLog({
        topic0: [erc721.events.Transfer.topic]
    })

export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>
