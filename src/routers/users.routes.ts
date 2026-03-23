import { Router } from 'express'
import { loginController, logoutController, registerController } from '../controllers/users.controllers'
import {
  accessTokenValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '../middlewares/users.middlewares'
import wrapRequestHandler from '../utils/handlers'

const userRouters = Router()
/**
 * Description: Handles user login
 * Path /login
 * METHOD: POST
 * Body: { email:string, password:string }
 */
userRouters.post('/login', loginValidator, wrapRequestHandler(loginController))
/**
 * Description: Handles user registration
 * Path /register
 * METHOD: POST
 * Body: { name:string, email:string, password:string, confirm_password:string, date_of_birth: ISO8601 }
 */
userRouters.post('/register', registerValidator, wrapRequestHandler(registerController))
/**
 * Description: Handles user logout
 * Path /logout
 * METHOD: POST
 * Body: { refresh_token: string }
 */
userRouters.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))

export default userRouters
