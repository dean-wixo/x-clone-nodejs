import { Request } from 'express'
import { checkSchema } from 'express-validator'
import databaseService from '../services/database.services'
import { hashPassword } from '../utils/crypto'
import { validate } from '../utils/validation'
import { verifyToken } from '../utils/jwt'
import { ErrorWithStatus } from '../models/Errors'
import { JsonWebTokenError } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import HTTP_STATUS from '../constants/httpStatus'

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: 'Email is required'
        },
        isEmail: {
          errorMessage: 'Email is invalid'
        },
        trim: true
      },
      password: {
        notEmpty: {
          errorMessage: 'Password is required'
        },
        isString: {
          errorMessage: 'Password must be a string'
        },
        isLength: {
          options: { min: 6, max: 100 },
          errorMessage: 'Password must be 6-100 characters'
        },
        custom: {
          options: async (value, { req }) => {
            // Hash password và tìm user trong database
            const user = await databaseService.users.findOne({
              email: req.body.email,
              password: hashPassword(value)
            })

            if (!user) {
              throw new ErrorWithStatus({
                message: 'Email or password is incorrect',
                status: 401
              })
            }

            // Lưu user vào req để controller dùng
            req.user = user
            return true
          }
        }
      }
    },
    ['body']
  )
)

// 422: Validation error
export const registerValidator = validate(
  checkSchema(
    {
      name: {
        notEmpty: true,
        isLength: {
          options: {
            min: 1,
            max: 100
          }
        },
        trim: true
      },
      email: {
        trim: true,
        notEmpty: true,
        isEmail: true,
        custom: {
          options: async (value, { req }) => {
            const user = await databaseService.users.findOne({
              email: value,
              password: hashPassword(req.body.password)
            })
            if (user === null) {
              throw new Error('Email is already in use')
            }
            req.user = user
            return true
          }
        }
      },
      password: {
        notEmpty: true,
        isString: true,
        isLength: {
          options: {
            min: 6,
            max: 100
          }
        },
        isStrongPassword: {
          errorMessage:
            'Password must be at least 6 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one symbol',
          options: {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
          }
        }
      },
      confirm_password: {
        custom: {
          options: (value, { req }) => value === req.body.password,
          errorMessage: 'Passwords do not match'
        },
        notEmpty: true,
        isString: true,
        isLength: {
          options: {
            min: 6,
            max: 100
          }
        },
        isStrongPassword: {
          errorMessage:
            'Passwords must be at least 6 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one symbol',
          options: {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
          }
        }
      },
      date_of_birth: {
        notEmpty: true,
        isISO8601: {
          options: {
            strict: true,
            strictSeparator: true
          }
        }
      }
    },
    ['body']
  )
)

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        custom: {
          options: async (value, { req }) => {
            // Check nếu thiếu refresh_token → 401
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Refresh token is required',
                status: 401
              })
            }

            try {
              const [decoded_refresh_token, refresh_token] = await Promise.all([
                verifyToken({ token: value, secretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string }),
                databaseService.refreshTokens.findOne({ token: value })
              ])
              if (refresh_token === null) {
                throw new ErrorWithStatus({ message: 'Refresh token is invalid', status: 401 })
              }
              ;(req as Request).decoded_refresh_token = decoded_refresh_token
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({ message: error.message, status: 401 })
              }
              throw error
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      authorization: {
        notEmpty: {
          errorMessage: 'Authorization header is required'
        },
        isString: true,
        custom: {
          options: async (value, { req }) => {
            const access_token = value.split('Bearer ')[1]
            if (!access_token) {
              throw new ErrorWithStatus({ message: 'Access token is required', status: 401 })
            }
            const decoded_authorization = await verifyToken({
              token: access_token,
              secretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
            })
            ;(req as Request).decoded_authorization = decoded_authorization
            return true
          }
        }
      }
    },
    ['headers']
  )
)

export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        custom: {
          options: async (value, { req }) => {
            // Check nếu thiếu email_verify_token → 401
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Email verify token is required',
                status: 401
              })
            }
            try {
              const decoded_email_verify_token = await verifyToken({
                token: value,
                secretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })
              ;(req as Request).decoded_email_verify_token = decoded_email_verify_token
            } catch (error) {
              throw new ErrorWithStatus({
                message: capitalize((error as JsonWebTokenError).message),
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            return true
          }
        }
      }
    },
    ['body']
  )
)
