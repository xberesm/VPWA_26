import vine from '@vinejs/vine'

// Validacia pri vytvarani kanala cez UI
export const createChannelValidator = vine.create({
  name: vine
    .string()
    .trim()
    .toLowerCase()
    .minLength(3)
    .maxLength(30)
    .regex(/^[a-z0-9_-]+$/)
    .unique({
      table: 'channels',
      column: 'name',
    }),

  description: vine.string().trim().maxLength(500).optional(),

  isPrivate: vine.boolean().optional(),
})

// Validacia pri prikaze /join
// Nazov nemusi byt novy - mozeme vstupit do existujuceho kanala
export const joinChannelValidator = vine.create({
  name: vine
    .string()
    .trim()
    .toLowerCase()
    .minLength(3)
    .maxLength(30)
    .regex(/^[a-z0-9_-]+$/),

  isPrivate: vine.boolean().optional(),
})
