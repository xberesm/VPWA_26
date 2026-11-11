import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // UC3 - Spravy v komunikacnych kanaloch
    this.schema.createTable('messages', (table) => {
      table.increments('id')

      // Kanal, v ktorom bola sprava odoslana
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('channels.id')
        .onDelete('CASCADE')

      // Pouzivatel, ktory spravu odoslal
      table
        .integer('author_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('RESTRICT')

      // Obsah a cas odoslania
      table.text('text').notNullable()

      table.timestamp('created_at').notNullable().defaultTo(this.now())

      // Efektivne nacitavanie historie kanala
      table.index(['channel_id', 'id'])
    })

    // UC6 - Pouzivatelia oznaceni cez @nickname
    this.schema.createTable('message_mentions', (table) => {
      table.increments('id')

      table
        .integer('message_id')
        .unsigned()
        .notNullable()
        .references('messages.id')
        .onDelete('CASCADE')

      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')

      // Rovnaky pouzivatel sa v jednej sprave
      // eviduje iba raz
      table.unique(['message_id', 'user_id'])

      table.index(['user_id', 'message_id'])
    })
  }

  async down() {
    // Pri rollbacku odstranime najskor zavislu tabulku
    this.schema.dropTable('message_mentions')
    this.schema.dropTable('messages')
  }
}
