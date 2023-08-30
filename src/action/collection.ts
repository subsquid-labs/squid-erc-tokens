import {Contract, TokenStandard} from '../model'
import {Action} from './base'

export interface CreateData {
    contractId: string
    address: string
}

export class CreateAction extends Action<CreateData> {
    async perform() {
        const contract = new Contract({
            id: this.data.contractId,
            address: this.data.address,
            interfaces: [],
            totalSupply: 0n,
        })

        await this.store.insert(contract)
        this.log.debug(`Contract ${contract.id} created`)
    }
}
