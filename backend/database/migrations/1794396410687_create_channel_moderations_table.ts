import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Hlasy za vyhodenie pouzivatela z verejneho kanala
    this.schema.createTable('channel_kick_votes', (table) => {
      table.increments('id')

      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('channels.id')
        .onDelete('CASCADE')

      // Pouzivatel, ktoreho chceme vyhodit
      table
        .integer('target_user_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')

      // Pouzivatel, ktory hlasoval
      table
        .integer('voter_user_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')

      // Kazdy clen moze hlasovat za
      // vyhodenie konkretnej osoby iba raz
      table.unique(['channel_id', 'target_user_id', 'voter_user_id'])

      table.timestamp('created_at').notNullable().defaultTo(this.now())
    })

    // Trvale zakazy vstupu do kanalov
    this.schema.createTable('channel_bans', (table) => {
      table.increments('id')

      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('channels.id')
        .onDelete('CASCADE')

      // Zabanovany pouzivatel
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')

      // Kto udelil posledny rozhodujuci hlas
      // alebo spravcovsky ban
      table
        .integer('banned_by_user_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')

      table.timestamp('banned_at').notNullable().defaultTo(this.now())

      // V jednom kanali moze mat pouzivatel
      // iba jeden aktivny trvaly ban
      table.unique(['channel_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable('channel_bans')
    this.schema.dropTable('channel_kick_votes')
  }
}
