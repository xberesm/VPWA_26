import type { ApplicationService } from '@adonisjs/core/types'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'

export default class ChannelCleanupProvider {
  private timer: ReturnType<typeof setInterval> | null = null
  private cleanupRunning = false

  constructor(protected app: ApplicationService) {}

  // UC2 - Automaticke mazanie neaktivnych kanalov
  private async cleanupInactiveChannels(): Promise<void> {
    // Zabranime sucasnemu spusteniu dvoch kontrol
    if (this.cleanupRunning) {
      return
    }

    this.cleanupRunning = true

    try {
      // Kanal je neaktivny, ak od poslednej aktivity
      // ubehlo aspon 30 dni.
      //
      // COALESCE zabezpeci, ze pri kanaloch
      // bez poslednej aktivity pouzijeme datum vzniku.

      const deletedChannels = await db
        .from('channels')
        .whereRaw("COALESCE(last_activity_at, created_at) <= NOW() - INTERVAL '30 days'")
        .returning(['id', 'name'])
        .delete()

      if (deletedChannels.length === 0) {
        logger.info('Channel cleanup: No inactive channels found.')
        return
      }

      const names = deletedChannels.map((channel) => channel.name).join(', ')

      logger.info(`Channel cleanup: Deleted ${deletedChannels.length} channel(s): ${names}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      logger.error(`Channel cleanup failed: ${message}`)
    } finally {
      this.cleanupRunning = false
    }
  }

  // Spusti sa po starte AdonisJS servera
  async ready() {
    // Automaticku ulohu spustame iba
    // na HTTP serveri, nie pri migraciach
    // alebo typechecku.
    if (this.app.getEnvironment() !== 'web') {
      return
    }

    // Prva kontrola hned po starte
    await this.cleanupInactiveChannels()

    // Dalsie kontroly kazdu hodinu
    this.timer = setInterval(
      () => {
        void this.cleanupInactiveChannels()
      },
      60 * 60 * 1000
    )

    // Timer nebude blokovat vypnutie servera
    this.timer.unref()

    logger.info('Automatic channel cleanup enabled (every hour).')
  }

  // Pri vypnuti servera zastavime timer
  async shutdown() {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
