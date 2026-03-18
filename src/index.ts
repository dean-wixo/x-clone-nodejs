import express from 'express'
import defaultErrorHandler from './middlewares/error.middlewares'
import usersRouter from './routers/users.routes'
import databaseService from './services/database.services'

const app = express()
const PORT = process.env.PORT || 3000

// Parse JSON request bodies
databaseService.connect()
app.use(express.json())
app.use('/users', usersRouter)
app.use(defaultErrorHandler)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export default app
