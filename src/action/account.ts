import {Account} from '../model'
import {Action} from './base'

export interface CreateData {
    accountId: string
    address: string
}

export class CreateAction extends Action<CreateData> {
    async perform() {
        const user = new Account({
            id: this.data.accountId,
            address: this.data.address,
        })

        await this.store.insert(user)
        this.log.debug(`Account ${user.id} created`)
    }
}
