export function createAccountId(address: string) {
    return address
}

export function createBalanceId(accountAddress: string, contractAddress: string, tokenIndex?: bigint) {
    return `${createAccountId(accountAddress)}-${createTokenId(contractAddress, tokenIndex)}`
}

export function createContractId(address: string) {
    return address
}

export function createTokenId(contractAddress: string, index?: bigint) {
    let id = createContractId(contractAddress)
    if (index != null) {
        id += `-${index.toString().padStart(10, '0')}`
    }
    return id
}
