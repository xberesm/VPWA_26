/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
| API endpoints for VPWA Chat
|--------------------------------------------------------------------------
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

const ChannelsController = () => import('#controllers/channels_controller')

const ChannelDeparturesController = () => import('#controllers/channel_departures_controller')

const ChannelModerationController = () => import('#controllers/channel_moderation_controller')

const MessagesController = () => import('#controllers/messages_controller')

// Test servera
router.get('/', () => {
  return { hello: 'world' }
})

// Autentifikacia
router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])

        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])

        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .use(middleware.auth())
  })
  .prefix('/api/v1')

// Kanaly, spravy a moderovanie
router
  .group(() => {
    // UC2 - Moje kanaly
    router.get('/channels', [ChannelsController, 'index'])

    // UC2 - Vytvorenie kanala
    router.post('/channels', [ChannelsController, 'store'])

    // UC2 - Verejne kanaly
    router.get('/channels/public', [ChannelsController, 'publicIndex'])

    // UC4 - /join
    router.post('/channels/join', [ChannelsController, 'join'])

    // UC10 - Zoznam clenov
    router.get('/channels/:id/members', [ChannelsController, 'members'])

    // UC2 - Otvorenie kanala
    router.post('/channels/:id/open', [ChannelsController, 'open'])

    // UC5 - /cancel
    router.delete('/channels/:id/membership', [ChannelDeparturesController, 'cancel'])

    // UC4 - /quit
    router.delete('/channels/:id', [ChannelDeparturesController, 'quit'])

    // UC3 - Historia sprav
    router.get('/channels/:id/messages', [MessagesController, 'index'])

    // UC3 + UC6 - Odoslanie spravy
    router.post('/channels/:id/messages', [MessagesController, 'store'])

    // UC4 - /invite
    router.post('/channels/:id/invite', [ChannelModerationController, 'invite'])

    // UC4 - /revoke
    router.post('/channels/:id/revoke', [ChannelModerationController, 'revoke'])

    // UC4 - /kick
    router.post('/channels/:id/kick', [ChannelModerationController, 'kick'])
  })
  .prefix('/api/v1')
  .use(middleware.auth())
