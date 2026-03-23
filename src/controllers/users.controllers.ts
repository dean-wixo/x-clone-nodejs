import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { LogoutReqBody, RegisterRequestBody } from '../models/requests/User.requests'
import usersService from '../services/users.services'
import databaseService from '../services/database.services'

export const loginController = async (req: Request, res: Response) => {
  // Lấy user từ req.user (đã được set bởi loginValidator)
  const user = req.user! // ! means we're sure it exists (from validator)
  const user_id = user._id!.toString()

  // Gọi service để tạo access_token và refresh_token
  const result = await usersService.login(user_id)

  return res.json({
    message: 'Login successful',
    result
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterRequestBody>, res: Response) => {
  const result = await usersService.register(req.body)
  return res.json({
    message: 'Registration successful',
    result
  })
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  // Ở đây bạn có thể xóa refresh token khỏi database nếu muốn
  // Ví dụ: await databaseService.refreshTokens.deleteOne({ token: req.body.refresh_token })
  const { refresh_token } = req.body
  const result = await usersService.logout(refresh_token)
  return res.json({
    message: 'Logout successful',
    result
  })
}
