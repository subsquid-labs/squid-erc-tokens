module.exports = class Data1693388449422 {
    name = 'Data1693388449422'

    async up(db) {
        await db.query(`CREATE INDEX "IDX_d6624eacc30144ea97915fe846" ON "transfer" ("block_number") `)
        await db.query(`CREATE INDEX "IDX_70ff8b624c3118ac3a4862d22c" ON "transfer" ("timestamp") `)
        await db.query(`CREATE UNIQUE INDEX "IDX_4bbe5fb40812718baf74cc9a79" ON "contract" ("address") `)
        await db.query(`CREATE INDEX "IDX_db8487de6f651bd2705a8a892e" ON "mint" ("block_number") `)
        await db.query(`CREATE INDEX "IDX_a99c32dd9a775edfcc4340c206" ON "mint" ("timestamp") `)
        await db.query(`CREATE INDEX "IDX_256979d718b3d192ec491aa210" ON "burn" ("block_number") `)
        await db.query(`CREATE INDEX "IDX_51879159280bddc67fbdbd9df9" ON "burn" ("timestamp") `)
        await db.query(`CREATE INDEX "IDX_5677006427151eb0f734664500" ON "token" ("type") `)
        await db.query(`CREATE INDEX "IDX_fec2d3fd5f6c26ab5c1dbd45b7" ON "token" ("index") `)
        await db.query(`CREATE UNIQUE INDEX "IDX_83603c168bc00b20544539fbea" ON "account" ("address") `)
    }

    async down(db) {
        await db.query(`DROP INDEX "public"."IDX_d6624eacc30144ea97915fe846"`)
        await db.query(`DROP INDEX "public"."IDX_70ff8b624c3118ac3a4862d22c"`)
        await db.query(`DROP INDEX "public"."IDX_4bbe5fb40812718baf74cc9a79"`)
        await db.query(`DROP INDEX "public"."IDX_db8487de6f651bd2705a8a892e"`)
        await db.query(`DROP INDEX "public"."IDX_a99c32dd9a775edfcc4340c206"`)
        await db.query(`DROP INDEX "public"."IDX_256979d718b3d192ec491aa210"`)
        await db.query(`DROP INDEX "public"."IDX_51879159280bddc67fbdbd9df9"`)
        await db.query(`DROP INDEX "public"."IDX_5677006427151eb0f734664500"`)
        await db.query(`DROP INDEX "public"."IDX_fec2d3fd5f6c26ab5c1dbd45b7"`)
        await db.query(`DROP INDEX "public"."IDX_83603c168bc00b20544539fbea"`)
    }
}
