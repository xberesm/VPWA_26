import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Udaje pouzivatela pozadovane zadanim
      table.string('first_name', 100).nullable()
      table.string('last_name', 100).nullable()

      // Kazdy nickname musi byt unikatny
      table.string('nickname', 50).nullable().unique()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('first_name')
      table.dropColumn('last_name')
      table.dropColumn('nickname')
    })
  }
}
