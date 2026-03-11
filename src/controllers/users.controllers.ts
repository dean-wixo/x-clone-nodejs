import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import usersService from '../services/users.services'
import { RegisterRequestBody } from '../models/schemas/requests/User.requests'

export const loginController = (req: Request, res: Response) => {
  res.json({
    message: 'Login successful',
    user: {
      email: req.body.email
    }
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterRequestBody>, res: Response) => {
  try {
    const result = await usersService.register(req.body)
    return res.json({
      message: 'Registration successful',
      result
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(400).json({
      message: 'Registration failed',
      error: error instanceof Error ? { message: error.message, name: error.name } : String(error)
    })
  }
}
