// Global type definitions for the project
import { TokenPayload } from './models/requests/User.requests'
import User from './models/schemas/User.schema'

// Extend Express Request to add custom properties
declare module 'express' {
  interface Request {
    user?: User
    decoded_authorization?: TokenPayload
    decoded_refresh_token?: TokenPayload
  }
}
