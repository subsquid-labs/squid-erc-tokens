import {lookupArchive} from '@subsquid/archive-registry'
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
import * as erc1155 from './abi/erc1155'

export const processor = new EvmBatchProcessor()
    .setDataSource({
        archive: lookupArchive('moonriver', {type: 'EVM'}),
        chain: 'https://moonriver-rpc.dwellir.com',
    })
    .setFinalityConfirmation(75)
    .setFields({
        log: {
            address: true,
            data: true,
            topics: true,
            transactionHash: true,
        },
    })
    .addLog({
        topic0: [erc20.events.Transfer.topic],
    })
    .addLog({
        topic0: [erc721.events.Transfer.topic],
    })

export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>
