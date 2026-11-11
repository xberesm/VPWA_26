import Channel from '#models/channel'
import { createChannelValidator, joinChannelValidator } from '#validators/channel'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class ChannelsController {
  // UC2 - Kanaly prihlaseneho pouzivatela
  async index({ auth }: HttpContext) {
    const user = auth.getUserOrFail()

    const rows = await db
      .from('channels as c')
      .join('channel_members as cm', 'c.id', 'cm.channel_id')
      .where('cm.user_id', user.id)
      .select(
        'c.id',
        'c.name',
        'c.description',
        'c.is_private',
        'c.owner_id',
        'c.last_activity_at',
        'cm.invited'
      )
      .orderBy('cm.invited', 'desc')
      .orderBy('c.name', 'asc')

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        isPrivate: row.is_private,
        ownerId: row.owner_id,
        invited: row.invited,
        lastActivityAt: row.last_activity_at,
      })),
    }
  }

  // UC2 - Vytvorenie kanala cez UI
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const { name, description, isPrivate } = await request.validateUsing(createChannelValidator)

    const channel = await db.transaction(async (trx) => {
      const newChannel = new Channel()

      newChannel.name = name
      newChannel.description = description ?? ''
      newChannel.isPrivate = isPrivate ?? false
      newChannel.ownerId = user.id

      newChannel.useTransaction(trx)
      await newChannel.save()

      await trx.table('channel_members').insert({
        channel_id: newChannel.id,
        user_id: user.id,
        invited: false,
        joined_at: new Date(),
      })

      return newChannel
    })

    return response.created({
      data: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        isPrivate: channel.isPrivate,
        ownerId: channel.ownerId,
        invited: false,
        lastActivityAt: channel.lastActivityAt,
      },
    })
  }

  // UC2 - Verejne kanaly dostupne na pripojenie
  async publicIndex({ auth }: HttpContext) {
    const user = auth.getUserOrFail()

    const rows = await db
      .from('channels as c')
      .where('c.is_private', false)

      // Nezobrazujeme kanaly, kde uz sme clenom
      .whereNotIn('c.id', db.from('channel_members').select('channel_id').where('user_id', user.id))

      // NOVINKA:
      // Nezobrazujeme kanaly, kde mame trvaly ban
      .whereNotIn('c.id', db.from('channel_bans').select('channel_id').where('user_id', user.id))

      .select('c.id', 'c.name', 'c.description', 'c.is_private', 'c.owner_id', 'c.last_activity_at')
      .orderBy('c.name', 'asc')

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        isPrivate: row.is_private,
        ownerId: row.owner_id,
        invited: false,
        lastActivityAt: row.last_activity_at,
      })),
    }
  }

  // UC4 - /join channelName [private]
  async join({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const { name, isPrivate } = await request.validateUsing(joinChannelValidator)

    const result = await db.transaction(async (trx) => {
      const existing = await trx.from('channels').where('name', name).forUpdate().first()

      if (existing) {
        // NOVINKA:
        // Najskor kontrolujeme trvaly ban.
        // Zabanovany pouzivatel sa nemoze vratit
        // ani cez /join, ani cez Explore.
        const ban = await trx
          .from('channel_bans')
          .where('channel_id', existing.id)
          .where('user_id', user.id)
          .first()

        if (ban) {
          return {
            status: 'banned',
            channel: existing,
          }
        }

        const membership = await trx
          .from('channel_members')
          .where('channel_id', existing.id)
          .where('user_id', user.id)
          .first()

        if (membership) {
          return {
            status: 'already_member',
            channel: existing,
          }
        }

        // Sukromny kanal vyzaduje pozvanku
        if (existing.is_private) {
          return {
            status: 'private',
            channel: existing,
          }
        }

        // Nemozeme vytvorit sukromny kanal
        // s nazvom existujuceho verejneho
        if (isPrivate) {
          return {
            status: 'name_taken',
            channel: existing,
          }
        }

        // Pripojenie do verejneho kanala
        await trx
          .table('channel_members')
          .insert({
            channel_id: existing.id,
            user_id: user.id,
            invited: false,
            joined_at: new Date(),
          })
          .onConflict(['channel_id', 'user_id'])
          .ignore()

        return {
          status: 'joined',
          channel: existing,
        }
      }

      // Kanal neexistuje - vytvorime ho
      const [created] = await trx
        .table('channels')
        .returning('*')
        .insert({
          name,
          description: '',
          is_private: isPrivate ?? false,
          owner_id: user.id,
          created_at: new Date(),
          last_activity_at: new Date(),
        })

      if (!created) {
        throw new Error('Channel could not be created.')
      }

      await trx.table('channel_members').insert({
        channel_id: created.id,
        user_id: user.id,
        invited: false,
        joined_at: new Date(),
      })

      return {
        status: 'created',
        channel: created,
      }
    })

    // NOVINKA: Odmietnutie zabanovaneho pouzivatela
    if (result.status === 'banned') {
      return response.forbidden({
        message: 'You are permanently banned from this channel.',
      })
    }

    if (result.status === 'private') {
      return response.forbidden({
        message: 'This channel is private. Invitation required.',
      })
    }

    if (result.status === 'name_taken') {
      return response.conflict({
        message: 'A public channel with this name already exists.',
      })
    }

    const channel = result.channel

    return {
      message:
        result.status === 'created'
          ? `Channel #${channel.name} created.`
          : result.status === 'joined'
            ? `Joined #${channel.name}.`
            : `Already a member of #${channel.name}.`,

      data: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        isPrivate: channel.is_private,
        ownerId: channel.owner_id,
        invited: false,
        lastActivityAt: channel.last_activity_at,
      },
    }
  }

  // UC2 a UC10 - Zoznam clenov kanala
  async members({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)

    if (!Number.isInteger(channelId) || channelId <= 0) {
      return response.badRequest({
        message: 'Invalid channel ID.',
      })
    }

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

    const channel = await Channel.findOrFail(channelId)

    const rows = await db
      .from('channel_members as cm')
      .join('users as u', 'u.id', 'cm.user_id')
      .where('cm.channel_id', channelId)
      .select('u.id', 'u.nickname', 'u.email')
      .orderBy('u.nickname', 'asc')

    return {
      data: rows.map((row) => ({
        id: row.id,
        username: row.nickname ?? row.email.split('@')[0],
        isOwner: row.id === channel.ownerId,
      })),
    }
  }

  // UC2 - Otvorenie kanala a odstranenie NEW
  async open({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = Number(params.id)

    if (!Number.isInteger(channelId) || channelId <= 0) {
      return response.badRequest({
        message: 'Invalid channel ID.',
      })
    }

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

    await db
      .from('channel_members')
      .where('channel_id', channelId)
      .where('user_id', user.id)
      .update({
        invited: false,
      })

    return {
      message: 'Channel opened.',
    }
  }
}
