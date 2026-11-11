import vine from '@vinejs/vine'

// Spolocne pravidla pre prihlasenie a registraciu
const email = () => vine.string().trim().email().maxLength(254)

const password = () => vine.string().minLength(8).maxLength(32)

// Registracia noveho pouzivatela
export const signupValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100),

  lastName: vine.string().trim().minLength(1).maxLength(100),

  nickname: vine
    .string()
    .trim()
    .toLowerCase()
    .minLength(3)
    .maxLength(50)
    .regex(/^[a-z0-9_]+$/)
    .unique({ table: 'users', column: 'nickname' }),

  email: email().toLowerCase().unique({
    table: 'users',
    column: 'email',
  }),

  password: password(),

  passwordConfirmation: password().sameAs('password'),
})

// Prihlasenie existujuceho pouzivatela
export const loginValidator = vine.create({
  email: email().toLowerCase(),
  password: vine.string(),
})
