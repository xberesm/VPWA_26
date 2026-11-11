import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Komunikacne kanaly
    this.schema.createTable('channels', (table) => {
      table.increments('id')

      table.string('name', 30).notNullable().unique()
      table.text('description').notNullable().defaultTo('')
      table.boolean('is_private').notNullable().defaultTo(false)

      // Pouzivatel, ktory kanal vytvoril
      table.integer('owner_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')

      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()
      table.timestamp('last_activity_at').notNullable().defaultTo(this.now())
    })

    // Clenstva pouzivatelov v kanaloch
    this.schema.createTable('channel_members', (table) => {
      table.increments('id')

      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('channels.id')
        .onDelete('CASCADE')

      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')

      // Ci bol pouzivatel pozvany a ma mat kanal zvyrazneny
      table.boolean('invited').notNullable().defaultTo(false)

      table.timestamp('joined_at').notNullable().defaultTo(this.now())

      // Jeden pouzivatel moze byt clenom kanala iba raz
      table.unique(['channel_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable('channel_members')
    this.schema.dropTable('channels')
  }
}
