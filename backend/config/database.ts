import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  // Predvolená databáza aplikácie
  connection: 'pg',

  connections: {
    pg: {
      client: 'pg',

      // Údaje načítame zo súboru .env
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },

      // Migrácie databázy
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },

      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schema_rules.js'],
      },
    },
  },
})

export default dbConfig
