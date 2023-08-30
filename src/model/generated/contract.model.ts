import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
import * as marshal from "./marshal"
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

    @Column_("text", {nullable: false})
    address!: string

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    totalSupply!: bigint

    @Column_("varchar", {length: 7, array: true, nullable: false})
    interfaces!: (TokenStandard)[]

    @OneToMany_(() => Token, e => e.contract)
    tokens!: Token[]

    @OneToMany_(() => Transfer, e => e.contract)
    transfers!: Transfer[]
}
