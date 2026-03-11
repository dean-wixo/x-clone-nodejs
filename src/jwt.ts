import jwt, { SignOptions } from 'jsonwebtoken'

type SignTokenOptions = Omit<SignOptions, 'expiresIn'> & { expiresIn?: string | number }

export const signToken = ({
  payload,
  privateKey = process.env.JWT_SECRET as string,
  options = {
    algorithm: 'HS256'
  }
}: {
  payload: string | Buffer | object
  privateKey?: string
  options?: SignTokenOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options as SignOptions, (error, token) => {
      if (error) {
        reject(error)
      } else {
        resolve(token as string)
      }
    })
  })
}
