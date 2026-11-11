import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class ChannelModerationController {
  // Pomocna funkcia na kontrolu nickname
  private getNickname(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null
    }

    const nickname = value.trim().toLowerCase()

    return /^[a-z0-9_]{3,50}$/.test(nickname) ? nickname : null
  }

  // UC4 - /invite nickName
  async invite({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)
    const nickname = this.getNickname(request.input('nickname'))

    if (!Number.isInteger(channelId) || channelId <= 0 || !nickname) {
      return response.badRequest({
        message: 'Invalid channel ID or nickname.',
      })
    }

    const result = await db.transaction(async (trx) => {
      // Zamkneme kanal, aby sa operacie nekrizili
      const channel = await trx.from('channels').where('id', channelId).forUpdate().first()

      if (!channel) {
        return 'not_found'
      }

      const actor = await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', user.id)
        .first()

      if (!actor) {
        return 'not_member'
      }

      // V private kanali pozyva iba spravca
      if (channel.is_private && channel.owner_id !== user.id) {
        return 'not_allowed'
      }

      const target = await trx.from('users').where('nickname', nickname).first()

      if (!target) {
        return 'unknown_user'
      }

      const ban = await trx
        .from('channel_bans')
        .where('channel_id', channelId)
        .where('user_id', target.id)
        .first()

      // Ban moze zrusit iba spravca
      if (ban && channel.owner_id !== user.id) {
        return 'banned'
      }

      if (ban) {
        await trx
          .from('channel_bans')
          .where('channel_id', channelId)
          .where('user_id', target.id)
          .delete()

        // Po odbanovani zacina hlasovanie od nuly
        await trx
          .from('channel_kick_votes')
          .where('channel_id', channelId)
          .where('target_user_id', target.id)
          .delete()
      }

      const membership = await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', target.id)
        .first()

      if (membership) {
        return 'already_member'
      }

      // Pozvany pouzivatel sa stane clenom
      await trx
        .table('channel_members')
        .insert({
          channel_id: channelId,
          user_id: target.id,
          invited: true,
          joined_at: new Date(),
        })
        .onConflict(['channel_id', 'user_id'])
        .ignore()

      return ban ? 'unbanned' : 'invited'
    })

    switch (result) {
      case 'not_found':
        return response.notFound({ message: 'Channel not found.' })
      case 'not_member':
        return response.forbidden({ message: 'You are not a member.' })
      case 'not_allowed':
        return response.forbidden({ message: 'Only the owner can invite users.' })
      case 'unknown_user':
        return response.notFound({ message: 'User not found.' })
      case 'banned':
        return response.forbidden({ message: 'Only the owner can remove a ban.' })
      case 'already_member':
        return response.conflict({ message: 'User is already a member.' })
    }

    return {
      message:
        result === 'unbanned'
          ? `${nickname} was unbanned and invited.`
          : `${nickname} was invited.`,
    }
  }

  // UC4 - /revoke nickName
  async revoke({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)
    const nickname = this.getNickname(request.input('nickname'))

    if (!Number.isInteger(channelId) || channelId <= 0 || !nickname) {
      return response.badRequest({
        message: 'Invalid channel ID or nickname.',
      })
    }

    const result = await db.transaction(async (trx) => {
      const channel = await trx.from('channels').where('id', channelId).forUpdate().first()

      if (!channel) return 'not_found'

      // /revoke patri spravcovi sukromneho kanala
      if (!channel.is_private || channel.owner_id !== user.id) {
        return 'not_allowed'
      }

      const target = await trx.from('users').where('nickname', nickname).first()

      if (!target) return 'unknown_user'

      // Spravca nemoze odobrat sam seba cez /revoke
      if (target.id === channel.owner_id) {
        return 'owner'
      }

      const removed = await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', target.id)
        .returning('user_id')
        .delete()

      return removed.length > 0 ? 'removed' : 'not_member'
    })

    switch (result) {
      case 'not_found':
        return response.notFound({ message: 'Channel not found.' })
      case 'not_allowed':
        return response.forbidden({ message: 'Only the private channel owner can revoke users.' })
      case 'unknown_user':
        return response.notFound({ message: 'User not found.' })
      case 'owner':
        return response.forbidden({ message: 'Cannot revoke the owner.' })
      case 'not_member':
        return response.notFound({ message: 'User is not in this channel.' })
    }

    return { message: `${nickname} was removed from the channel.` }
  }

  // UC4 - /kick nickName
  async kick({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)
    const nickname = this.getNickname(request.input('nickname'))

    if (!Number.isInteger(channelId) || channelId <= 0 || !nickname) {
      return response.badRequest({
        message: 'Invalid channel ID or nickname.',
      })
    }

    const result = await db.transaction(async (trx) => {
      const channel = await trx.from('channels').where('id', channelId).forUpdate().first()

      if (!channel) return { status: 'not_found' }

      // /kick sa pouziva iba vo verejnom kanali
      if (channel.is_private) {
        return { status: 'private' }
      }

      const actor = await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', user.id)
        .first()

      if (!actor) return { status: 'not_member' }

      const target = await trx.from('users').where('nickname', nickname).first()

      if (!target) return { status: 'unknown_user' }

      if (target.id === user.id) {
        return { status: 'self' }
      }

      if (target.id === channel.owner_id) {
        return { status: 'owner' }
      }

      const existingBan = await trx
        .from('channel_bans')
        .where('channel_id', channelId)
        .where('user_id', target.id)
        .first()

      if (existingBan) {
        return { status: 'already_banned' }
      }

      const targetMembership = await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', target.id)
        .first()

      // Spravca moze udelit okamzity trvaly ban
      if (channel.owner_id === user.id) {
        if (!targetMembership) {
          return { status: 'not_in_channel' }
        }

        await trx.table('channel_bans').insert({
          channel_id: channelId,
          user_id: target.id,
          banned_by_user_id: user.id,
          banned_at: new Date(),
        })

        await trx
          .from('channel_members')
          .where('channel_id', channelId)
          .where('user_id', target.id)
          .delete()

        return { status: 'banned', votes: 3 }
      }

      // Bezny clen moze hlasovat iba raz
      const previousOwnVote = await trx
        .from('channel_kick_votes')
        .where('channel_id', channelId)
        .where('target_user_id', target.id)
        .where('voter_user_id', user.id)
        .first()

      if (previousOwnVote) {
        return { status: 'already_voted' }
      }

      // Dalsi clenovia mozu hlasovat aj po prvom
      // vyhodeni, kedy uz ciel nie je clenom.
      const previousVote = await trx
        .from('channel_kick_votes')
        .where('channel_id', channelId)
        .where('target_user_id', target.id)
        .first()

      if (!targetMembership && !previousVote) {
        return { status: 'not_in_channel' }
      }

      await trx.table('channel_kick_votes').insert({
        channel_id: channelId,
        target_user_id: target.id,
        voter_user_id: user.id,
        created_at: new Date(),
      })

      // Vyhodime pouzivatela z kanala
      await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', target.id)
        .delete()

      const counts = await trx
        .from('channel_kick_votes')
        .where('channel_id', channelId)
        .where('target_user_id', target.id)
        .count('* as total')

      const votes = Number(counts[0]?.total ?? 0)

      if (votes >= 3) {
        await trx.table('channel_bans').insert({
          channel_id: channelId,
          user_id: target.id,
          banned_by_user_id: user.id,
          banned_at: new Date(),
        })

        return { status: 'banned', votes }
      }

      return { status: 'kicked', votes }
    })

    switch (result.status) {
      case 'not_found':
        return response.notFound({ message: 'Channel not found.' })
      case 'private':
        return response.forbidden({ message: 'Use /revoke in a private channel.' })
      case 'not_member':
        return response.forbidden({ message: 'You are not a member.' })
      case 'unknown_user':
        return response.notFound({ message: 'User not found.' })
      case 'self':
        return response.badRequest({ message: 'You cannot kick yourself.' })
      case 'owner':
        return response.forbidden({ message: 'You cannot kick the channel owner.' })
      case 'already_banned':
        return response.conflict({ message: 'User is already banned.' })
      case 'already_voted':
        return response.conflict({ message: 'You already voted to kick this user.' })
      case 'not_in_channel':
        return response.notFound({ message: 'User is not in this channel.' })
    }

    if (result.status === 'banned') {
      return {
        message: `${nickname} has been permanently banned.`,
        banned: true,
        votes: result.votes,
      }
    }

    return {
      message: `${nickname} was kicked. Votes: ${result.votes}/3.`,
      banned: false,
      votes: result.votes,
    }
  }
}
