import {Logger} from '@subsquid/logger'
import {ActionQueue} from '../action/actionQueue'

export interface MapperConfig<Store> {
    log: Logger
    store: Store
    queue: ActionQueue
}

export abstract class Mapper<Store, Item> {
    constructor(protected config: MapperConfig<Store>) {}

    protected get log() {
        return this.config.log
    }

    protected get store() {
        return this.config.store
    }

    protected get queue() {
        return this.config.queue
    }

    abstract handle(item: Item): void
}

export interface MapperConstructor<Store, Item> {
    new (...args: ConstructorParameters<typeof Mapper<Store, Item>>): Mapper<Store, Item>
}
