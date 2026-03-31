import { config } from 'dotenv'
import { ObjectId } from 'mongodb'
import { TokenType, UserVerifyStatus } from '../constants/enums'
import { RegisterRequestBody } from '../models/requests/User.requests'
import User from '../models/schemas/User.schema'
import { hashPassword } from '../utils/crypto'
import { signToken } from '../utils/jwt'
import databaseService from './database.services'
import RefreshToken from '../models/requests/RefreshToken.schema'
import { ErrorWithStatus } from '../models/Errors'

config()

class UsersService {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.AccessToken
      },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
      }
    })
  }
  private signRefreshToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.RefreshToken
      },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: {
        expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || '100d') as string
      }
    })
  }
  private signAccessTokenAndRefreshToken(user_id: string) {
    return Promise.all([this.signAccessToken(user_id), this.signRefreshToken(user_id)])
  }
  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.EmailVerifyToken
      },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: {
        expiresIn: (process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN || '7d') as string
      }
    })
  }
  private signForgotPasswordToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.ForgotPasswordToken
      },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: (process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN || '1h') as string
      }
    })
  }
  async register(payload: RegisterRequestBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password),
        email_verify_token
      })
    )
    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken(user_id.toString())
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token
      })
    )
    console.log('Email verify token:', email_verify_token) // Log token for testing
    return { access_token, refresh_token }
  }
  async login(user_id: string) {
    const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken(user_id)
    await databaseService.refreshTokens.insertOne({
      token: refresh_token,
      user_id: new ObjectId(user_id)
    })
    return { access_token, refresh_token }
  }
  async logout(refresh_token: string) {
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
  }
  async verifyEmail(user_id: string) {
    const [token] = await Promise.all([
      this.signAccessTokenAndRefreshToken(user_id),
      databaseService.users.updateOne(
        { _id: new ObjectId(user_id) },
        //* note: update_at: new Date() là thời gian mongoDB tiếp nhận giá trị, không phải thời gian cập nhật của MongoDb
        // {
        //   $set: { email_verify_token: '', updated_at: new Date(), verify: UserVerifyStatus.Verified },
        //   // $currentDate sẽ cập nhật trường updated_at thành thời gian hiện tại của MongoDB, đảm bảo tính chính xác hơn so với việc set bằng new Date() ở phía server
        //   $currentDate: {
        //     updated_at: true
        //   },

        // },
        // đổi sang array, rồi đổi giá trị updated_at thành '$$NOW' cũng có thể đảm bảo thời gian update thật của mongoDB
        [
          {
            $set: { email_verify_token: '', updated_at: '$$NOW', verify: UserVerifyStatus.Verified },
            // $currentDate sẽ cập nhật trường updated_at thành thời gian hiện tại của MongoDB, đảm bảo tính chính xác hơn so với việc set bằng new Date() ở phía server
            $currentDate: {
              updated_at: true
            }
          }
        ]
      )
    ])
    const [access_token, refresh_token] = token
    return {
      message: 'Email verification successful',
      access_token,
      refresh_token
    }
  }
  async resendVerifyEmail(user_id: string) {
    const email_verify_token = await this.signEmailVerifyToken(user_id)
    console.log('Resend email verify token:', email_verify_token) // Log token for testing
    // cập nhật lại email_verify_token mới vào database trong document user
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: { email_verify_token },
        // cách 2: dùng $currentDate để đảm bảo thời gian cập nhật chính xác của MongoDB
        $currentDate: { updated_at: true }
      }
    )
    return {
      message: 'Resend email verification successful'
    }
  }
  async forgotPassword(user_id: string) {
    const forgot_password_token = await this.signForgotPasswordToken(user_id)
    console.log('Forgot password token:', forgot_password_token) // Log token for testing
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: { forgot_password_token },
        $currentDate: { updated_at: true }
      }
    )
  }
  async resetPassword(user_id: string, new_password: string, forgot_password_token: string) {
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user || user.forgot_password_token !== forgot_password_token) {
      throw new ErrorWithStatus({ message: 'Invalid forgot password token', status: 422 })
    }
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: { password: hashPassword(new_password), forgot_password_token: '' },
        $currentDate: { updated_at: true }
      }
    )
  }
}

const usersService = new UsersService()
export default usersService
