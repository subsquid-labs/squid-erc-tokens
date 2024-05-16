import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {TokenBalance} from "./tokenBalance.model"

@Entity_()
export class Account {
    constructor(props?: Partial<Account>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_({unique: true})
    @StringColumn_({nullable: false})
    address!: string

    @OneToMany_(() => TokenBalance, e => e.account)
    tokens!: TokenBalance[]
}
