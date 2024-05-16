import {
    Token,
    TokenBalance,
    Account,
    TokenStandard,
    Contract,
    Mint,
    Burn,
    Transfer
} from '../model'
import { StoreWithCache } from '@belopash/typeorm-store'
import { TaskQueue } from '../utils/queue'
import {
    createContractId,
    createAccountId,
    createBalanceId,
    createTokenId
} from '../utils/data'
import { ZERO_ADDRESS } from '../utils/constants'
import * as erc20 from '../abi/erc20'
import { ProcessorContext, Log } from '../processor'

type MappingContext = ProcessorContext<StoreWithCache> & { queue: TaskQueue }

export function handleErc20Transfer(
    mctx: MappingContext,
    log: Log
) {
    const event = erc20.events.Transfer.decode(log)

    const contractAddress = log.address
    const contractId = createContractId(contractAddress)
    mctx.store.defer(Contract, contractId)

    const tokenId = createTokenId(contractAddress)
    mctx.store.defer(Token, tokenId)

    const fromAddress = event.from
    const fromAccountId = createAccountId(fromAddress)
    const fromBalanceId = createBalanceId(fromAddress, contractAddress)
    mctx.store.defer(TokenBalance, fromBalanceId)
    mctx.store.defer(Account, fromAccountId)

    const toAddress = event.to
    const toAccountId = createAccountId(toAddress)
    const toBalanceId = createBalanceId(toAddress, contractAddress)
    mctx.store.defer(TokenBalance, toBalanceId)
    mctx.store.defer(Account, toAccountId)

    const amount = event.value

    if (fromAddress === ZERO_ADDRESS && toAddress === ZERO_ADDRESS) {
        mctx.log.info(`Skipping a ERC20 Transfer from null to null detected on contract ${log.address} txn ${log.transactionHash}`)
        return
    }

    mctx.queue.add(async () => {

        const contract = await mctx.store.getOrInsert(Contract, contractId, cid => {
            return new Contract({
                id: cid,
                address: contractAddress,
                totalSupply: 0n,
                interfaces: [TokenStandard.ERC20]
            })
        })

        const token = await mctx.store.getOrInsert(Token, tokenId, tid => {
            return new Token({
                id: tid,
                contract,
                type: TokenStandard.ERC20,
                supply: 0n
            })
        })

        const fromAccount = await mctx.store.getOrInsert(Account, fromAccountId, aid => {
            return new Account({
                id: aid,
                address: fromAddress
            })
        })

        const toAccount = await mctx.store.getOrInsert(Account, toAccountId, aid => {
            return new Account({
                id: aid,
                address: toAddress
            })
        })

        const eventEntityParams = {
            id: log.id,
            blockNumber: log.block.height,
            timestamp: new Date(log.block.timestamp),
            txnHash: log.transactionHash,
            contract,
            token,
            amount
        }

        if (fromAddress === ZERO_ADDRESS) {
            await mctx.store.insert(new Mint(eventEntityParams))
            contract.totalSupply += amount
            await mctx.store.upsert(contract)
            token.supply += amount
            await mctx.store.upsert(token)
        }
        else {
            // this allows for negative balances
            // if you're sure you won't be getting these, use getOrFail() instead
            const fromBalance = await mctx.store.getOrInsert(TokenBalance, fromBalanceId, id => {
                return new TokenBalance({
                    id,
                    account: fromAccount,
                    token,
                    value: 0n
                })
            })
            fromBalance.value -= amount
            await mctx.store.upsert(fromBalance)
        }

        if (toAddress === ZERO_ADDRESS) {
            await mctx.store.insert(new Burn(eventEntityParams))
            contract.totalSupply -= amount
            await mctx.store.upsert(contract)
            token.supply -= amount
            await mctx.store.upsert(token)
        }
        else {
            const toBalance = await mctx.store.getOrInsert(TokenBalance, toBalanceId, id => {
                return new TokenBalance({
                    id,
                    account: toAccount,
                    token,
                    value: 0n
                })
            })
            toBalance.value += amount
            await mctx.store.upsert(toBalance)
        }

        await mctx.store.insert(new Transfer({
            ...eventEntityParams,
            from: fromAccount,
            to: toAccount,
        }))

    })
}
