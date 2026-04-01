import { Router } from 'express'
import {
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  registerController,
  resendEmailVerifyController,
  verifyEmailController,
  verifyForgotPasswordController
} from '../controllers/users.controllers'
import {
  accessTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  verifyForgotPasswordTokenValidator
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

/**
 * Description: Handles forgot password request
 * Path /forgot-password
 * METHOD: POST
 * Headers: not required
 * Body: { email: string }
 */
userRouters.post('/forgot-password', forgotPasswordValidator, wrapRequestHandler(forgotPasswordController))

/**
 * Description: Verify forgot password token
 * Path /verify-forgot-password
 * METHOD: POST
 * Headers: not required
 * Body: { forgot_password_token: string }
 */
userRouters.post(
  '/verify-forgot-password',
  verifyForgotPasswordTokenValidator,
  wrapRequestHandler(verifyForgotPasswordController)
)

/**
 * Description: Handles reset password request
 * Path /reset-password
 * METHOD: POST
 * Headers: not required
 * Body: { forgot_password_token: string, password: string, confirm_password: string }
 */
userRouters.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))

export default userRouters
