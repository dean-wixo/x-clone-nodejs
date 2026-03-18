import { NextFunction, Request, RequestHandler, Response } from 'express'

const wrapRequestHandler = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Promise.resolve(fn(req, res, next)).catch(next)
    try {
      await fn(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}

export default wrapRequestHandler
