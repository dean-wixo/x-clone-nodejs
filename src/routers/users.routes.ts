import { Router } from 'express'
import {
  loginController,
  logoutController,
  registerController,
  resendEmailVerifyController,
  verifyEmailController
} from '../controllers/users.controllers'
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

/**
 * Description: Verify email when user clicks verification link in email
 * Path /verify-email
 * METHOD: POST
 * Headers: { Authorization: 'Bearer <access_token>' }
 * Body: { email_verify_token: string }
 */
userRouters.post('/verify-email', accessTokenValidator, wrapRequestHandler(verifyEmailController))

/**
 * Description: Resend email verification when user requests it
 * Path /resend-verify-email
 * METHOD: POST
 * Headers: { Authorization: 'Bearer <access_token>' }
 * Body: { email_verify_token: string }
 */
userRouters.post('/resend-verify-email', accessTokenValidator, wrapRequestHandler(resendEmailVerifyController))

export default userRouters
