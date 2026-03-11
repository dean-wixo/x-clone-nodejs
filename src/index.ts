import express from 'express'
import usersRouter from './routers/users.routes'
import databaseService from './services/database.services'

const app = express()
const PORT = process.env.PORT || 3000

// Parse JSON request bodies
app.use(express.json())
app.use('/users', usersRouter)
databaseService.connect()

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export default app
