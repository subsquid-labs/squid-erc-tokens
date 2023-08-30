import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {Account} from "./account.model"
import {Token} from "./token.model"

@Entity_()
export class TokenBalance {
    constructor(props?: Partial<TokenBalance>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Account, {nullable: true})
    account!: Account

    @Index_()
    @ManyToOne_(() => Token, {nullable: true})
    token!: Token

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    value!: bigint
}
