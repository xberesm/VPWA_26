import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class ChannelDeparturesController {
  // UC5 - /cancel
  // Bezny clen opusti kanal.
  // Spravca zrusenim clenstva zrusi cely kanal.
  async cancel({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)

    if (!Number.isInteger(channelId) || channelId <= 0) {
      return response.badRequest({
        message: 'Invalid channel ID.',
      })
    }

    const result = await db.transaction(async (trx) => {
      const channel = await trx.from('channels').where('id', channelId).forUpdate().first()

      if (!channel) {
        return 'not_found'
      }

      const membership = await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', user.id)
        .first()

      if (!membership) {
        return 'not_member'
      }

      if (channel.owner_id === user.id) {
        // Spravca opusta kanal = kanal zanika
        await trx.from('channels').where('id', channelId).delete()

        return 'deleted'
      }

      // Bezny clen opusta kanal
      await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', user.id)
        .delete()

      return 'left'
    })

    if (result === 'not_found') {
      return response.notFound({
        message: 'Channel not found.',
      })
    }

    if (result === 'not_member') {
      return response.forbidden({
        message: 'You are not a member of this channel.',
      })
    }

    return {
      message:
        result === 'deleted'
          ? 'Channel deleted because the owner left.'
          : 'You have left the channel.',
      deleted: result === 'deleted',
    }
  }

  // UC4 - /quit
  // Kanal moze zrusit iba jeho spravca.
  async quit({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)

    if (!Number.isInteger(channelId) || channelId <= 0) {
      return response.badRequest({
        message: 'Invalid channel ID.',
      })
    }

    const result = await db.transaction(async (trx) => {
      const channel = await trx.from('channels').where('id', channelId).forUpdate().first()

      if (!channel) {
        return 'not_found'
      }

      if (channel.owner_id !== user.id) {
        return 'forbidden'
      }

      await trx.from('channels').where('id', channelId).delete()

      return 'deleted'
    })

    if (result === 'not_found') {
      return response.notFound({
        message: 'Channel not found.',
      })
    }

    if (result === 'forbidden') {
      return response.forbidden({
        message: 'Only the channel owner can delete it.',
      })
    }

    return {
      message: 'Channel deleted successfully.',
      deleted: true,
    }
  }
}
