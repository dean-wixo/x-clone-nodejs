export interface RegisterRequestBody {
  name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
}

export interface LoginReqBody {
  email: string
  password: string
}

export interface TokenPayload {
  user_id: string
  token_type: string
  iat?: number
  exp?: number
}

export interface LogoutReqBody {
  refresh_token: string
}

export interface VerifyEmailReqBody {
  email_verify_token: string
}
