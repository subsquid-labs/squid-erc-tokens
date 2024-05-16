import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, BigIntColumn as BigIntColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {TokenStandard} from "./_tokenStandard"
import {Token} from "./token.model"
import {Transfer} from "./transfer.model"

@Entity_()
export class Contract {
    constructor(props?: Partial<Contract>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_({unique: true})
    @StringColumn_({nullable: false})
    address!: string

    @BigIntColumn_({nullable: false})
    totalSupply!: bigint

    @Column_("varchar", {length: 7, array: true, nullable: false})
    interfaces!: (TokenStandard)[]

    @OneToMany_(() => Token, e => e.contract)
    tokens!: Token[]

    @OneToMany_(() => Transfer, e => e.contract)
    transfers!: Transfer[]
}
