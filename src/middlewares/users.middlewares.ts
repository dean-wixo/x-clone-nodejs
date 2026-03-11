import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import { validate } from '../validation'
import usersService from '../services/users.services'

export const loginValidator = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  next()
}

export const registerValidator = validate(
  checkSchema({
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
        options: async (email) => {
          const isEmailExisted = await usersService.checkEmailExists(email)
          if (isEmailExisted) {
            throw new Error('Email already in use')
          }
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
  })
)
