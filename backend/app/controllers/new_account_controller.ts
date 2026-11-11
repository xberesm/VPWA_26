import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class NewAccountController {
  async store({ request, serialize }: HttpContext) {
    // 1. Overenie udajov z registracneho formulara
    const { firstName, lastName, nickname, email, password } =
      await request.validateUsing(signupValidator)

    // 2. Vytvorenie pouzivatela v PostgreSQL
    const user = await User.create({
      firstName,
      lastName,
      nickname,
      fullName: `${firstName} ${lastName}`,
      email,
      password,
    })

    // 3. Vytvorenie autentifikacneho tokenu
    const token = await User.accessTokens.create(user)

    // 4. Odpoved pre frontend
    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
