import assert from 'assert'
import {checkAddressChecksum} from 'ethereum-checksum-address'

export function createAccountId(address: string) {
    assert(checkAddressChecksum(address), 'address should be EVM address')
    return address.toLowerCase()
}

export function createBalanceId(accountAddress: string, contractAddress: string, tokenIndex?: bigint) {
    return `${createAccountId(accountAddress)}-${createTokenId(contractAddress, tokenIndex)}`
}

export function createContractId(address: string) {
    assert(checkAddressChecksum(address), 'address should be EVM address')
    return address.toLowerCase()
}

export function createTokenId(contractAddress: string, index?: bigint) {
    let id = createContractId(contractAddress)
    if (index != null) {
        id += `-${index.toString().padStart(10, '0')}`
    }
    return id
}
