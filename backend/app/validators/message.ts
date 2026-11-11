import vine from '@vinejs/vine'

// Validacia novej spravy
export const createMessageValidator = vine.create({
  text: vine.string().trim().minLength(1).maxLength(5000),
})
