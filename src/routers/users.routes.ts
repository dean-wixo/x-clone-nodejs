import { Router } from 'express'
import { loginController, registerController } from '../controllers/users.controllers'
import { loginValidator, registerValidator } from '../middlewares/users.middlewares'
import wrapRequestHandler from '../utils/handlers'

const userRouters = Router()

userRouters.post('/login', loginValidator, loginController)
/**
 * Description: Handles user login
 * Path /register
 * METHOD: POST
 * Body: { name:string, email:string, password:string, confirm_password:string, date_of_birth: ISO8601 }
 */

userRouters.post('/register', registerValidator, wrapRequestHandler(registerController))

export default userRouters
