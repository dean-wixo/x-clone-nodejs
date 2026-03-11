import { Collection, Db, MongoClient } from 'mongodb'
import env from 'dotenv'
import User from '../models/schemas/User.schema'

env.config()

const username = process.env.DB_USERNAME
const password = process.env.DB_PASSWORD
const uri = `mongodb+srv://${username}:${password}@xclone.3vjmevd.mongodb.net/?appName=XClone`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (error) {
      // Ensures that the client will close when you finish/error
      // await this.client.close()
      console.log('Error', error)
      throw error
    }
  }

  get users(): Collection<User> {
    return this.db.collection(process.env.DB_COLLECTION_NAME as string)
  }
}

const databaseService = new DatabaseService()
export default databaseService
