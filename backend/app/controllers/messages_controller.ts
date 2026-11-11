import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { createMessageValidator } from '#validators/message'

export default class MessagesController {
  // UC3 - Nacitanie sprav z kanala
  async index({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)

    if (!Number.isInteger(channelId) || channelId <= 0) {
      return response.badRequest({
        message: 'Invalid channel ID.',
      })
    }

    // Historie moze vidiet iba clen kanala
    const membership = await db
      .from('channel_members')
      .where('channel_id', channelId)
      .where('user_id', user.id)
      .first()

    if (!membership) {
      return response.forbidden({
        message: 'You are not a member of this channel.',
      })
    }

    // Strankovanie po 20 spravach
    const rawLimit = request.input('limit')
    const rawBeforeId = request.input('beforeId')

    const limit = rawLimit === undefined ? 20 : Number(rawLimit)

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return response.badRequest({
        message: 'Limit must be between 1 and 50.',
      })
    }

    let beforeId: number | undefined

    if (rawBeforeId !== undefined) {
      beforeId = Number(rawBeforeId)

      if (!Number.isInteger(beforeId) || beforeId <= 0) {
        return response.badRequest({
          message: 'Invalid beforeId.',
        })
      }
    }

    // Najnovsie spravy nacitame ako prve
    const query = db
      .from('messages as m')
      .join('users as u', 'u.id', 'm.author_id')
      .where('m.channel_id', channelId)
      .select('m.id', 'm.channel_id', 'm.text', 'm.created_at', 'u.nickname as author')
      .orderBy('m.id', 'desc')
      .limit(limit + 1)

    if (beforeId !== undefined) {
      query.where('m.id', '<', beforeId)
    }

    const rows = await query

    // Jeden zaznam navyse zisti,
    // ci existuju starsie spravy
    const hasMore = rows.length > limit
    const page = rows.slice(0, limit).reverse()

    const messageIds = page.map((row) => row.id)

    // Nacitame oznacenych pouzivatelov naraz
    const mentions =
      messageIds.length > 0
        ? await db
            .from('message_mentions')
            .whereIn('message_id', messageIds)
            .select('message_id', 'user_id')
        : []

    const messages = page.map((row) => ({
      id: row.id,
      channelId: row.channel_id,
      author: row.author ?? 'unknown',
      text: row.text,
      createdAt: new Date(row.created_at).toISOString(),
      mentionedUserIds: mentions
        .filter((mention) => mention.message_id === row.id)
        .map((mention) => mention.user_id),
    }))

    return {
      data: messages,
      hasMore,
    }
  }

  // UC3 + UC6 - Odoslanie spravy
  async store({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)

    if (!Number.isInteger(channelId) || channelId <= 0) {
      return response.badRequest({
        message: 'Invalid channel ID.',
      })
    }

    const { text } = await request.validateUsing(createMessageValidator)

    // Najdeme vsetky @nickname v texte
    const mentionedNicknames = new Set<string>()

    for (const match of text.matchAll(/@([a-z0-9_]{3,50})(?![a-z0-9_-])/gi)) {
      if (match[1]) {
        mentionedNicknames.add(match[1].toLowerCase())
      }
    }

    // Spravu, oznacenia a aktivitu kanala
    // ulozime v jednej transakcii
    const result = await db.transaction(async (trx) => {
      // Zamknutie kanala pocas odosielania
      const channel = await trx.from('channels').where('id', channelId).forUpdate().first()

      if (!channel) {
        return { status: 'not_found' as const }
      }

      // Odosielatel musi byt clenom kanala
      const membership = await trx
        .from('channel_members')
        .where('channel_id', channelId)
        .where('user_id', user.id)
        .first()

      if (!membership) {
        return { status: 'forbidden' as const }
      }

      // Ulozenie spravy
      const [created] = await trx.table('messages').returning(['id', 'created_at']).insert({
        channel_id: channelId,
        author_id: user.id,
        text,
        created_at: new Date(),
      })

      if (!created) {
        throw new Error('Message could not be created.')
      }

      // Najdeme oznacenych pouzivatelov,
      // ktori su clenmi daneho kanala
      const recipients =
        mentionedNicknames.size > 0
          ? await trx
              .from('users as u')
              .join('channel_members as cm', 'cm.user_id', 'u.id')
              .where('cm.channel_id', channelId)
              .whereIn('u.nickname', [...mentionedNicknames])
              .select('u.id')
          : []

      const mentionedUserIds = recipients.map((recipient) => Number(recipient.id))

      // Zapiseme oznacenia do databazy
      if (mentionedUserIds.length > 0) {
        await trx.table('message_mentions').insert(
          mentionedUserIds.map((userId) => ({
            message_id: created.id,
            user_id: userId,
          }))
        )
      }

      // Aktualizujeme poslednu aktivitu kanala
      await trx.from('channels').where('id', channelId).update({
        last_activity_at: new Date(),
      })

      return {
        status: 'created' as const,
        message: {
          id: created.id,
          channelId,
          author: user.nickname ?? 'unknown',
          text,
          createdAt: new Date(created.created_at).toISOString(),
          mentionedUserIds,
        },
      }
    })

    if (result.status === 'not_found') {
      return response.notFound({
        message: 'Channel not found.',
      })
    }

    if (result.status === 'forbidden') {
      return response.forbidden({
        message: 'You are not a member of this channel.',
      })
    }

    return response.created({
      data: result.message,
    })
  }
}
