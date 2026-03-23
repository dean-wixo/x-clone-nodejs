import { Request } from 'express'
import { checkSchema } from 'express-validator'
import databaseService from '../services/database.services'
import { hashPassword } from '../utils/crypto'
import { validate } from '../utils/validation'
import { verifyToken } from '../utils/jwt'
import { ErrorWithStatus } from '../models/Errors'
import { JsonWebTokenError } from 'jsonwebtoken'

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
        notEmpty: {
          errorMessage: 'Refresh token is required'
        },

        custom: {
          options: async (value, { req }) => {
            try {
              const [decoded_refresh_token, refresh_token] = await Promise.all([
                verifyToken({ token: value }),
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
            const decoded_authorization = await verifyToken({ token: access_token })
            ;(req as Request).decoded_authorization = decoded_authorization
            return true
          }
        }
      }
    },
    ['headers']
  )
)
