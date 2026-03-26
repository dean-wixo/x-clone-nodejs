import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  LoginReqBody,
  LogoutReqBody,
  RegisterRequestBody,
  TokenPayload,
  VerifyEmailReqBody
} from '../models/requests/User.requests'
import usersService from '../services/users.services'
import databaseService from '../services/database.services'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '../constants/messages'
import { UserVerifyStatus } from '../constants/enums'

export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
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

export const verifyEmailController = async (req: Request<ParamsDictionary, any, VerifyEmailReqBody>, res: Response) => {
  const { user_id } = req.decoded_email_verify_token as TokenPayload
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (!user) return res.status(404).json({ message: 'User not found' })
  // email token rỗng nghĩa là verify rồi, không cần verify nữa, không trả về lỗi
  if (user.email_verify_token === '') {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFY_BEFORE
    })
  }
  const result = await usersService.verifyEmail(user_id)
  return res.json({
    message: 'Email verification successful',
    result
  })
}

export const resendEmailVerifyController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (!user) return res.status(404).json({ message: 'User not found' })
  // email token rỗng nghĩa là verify rồi, không cần verify nữa, không trả về lỗi
  if (user.verify === UserVerifyStatus.Verified) {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFY_BEFORE
    })
  }
  const result = await usersService.resendVerifyEmail(user_id)
  return res.json({
    message: 'Resend email verification successful',
    result
  })
}
