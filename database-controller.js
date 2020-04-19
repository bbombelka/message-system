const { MongoClient } = require('mongodb');
const databaseConfig = require('./database-config.js');

class DatabaseController {
  #connectMongoClient = async () => {
    this.client = new MongoClient(databaseConfig.url, { useUnifiedTopology: true });
    await this.client.connect();
  };

  #closeMongoClient = () => {
    this.client.close();
  };

  getThreadNumber = async () => {
    await this.#connectMongoClient();
    const threadsCollection = this.client.db(databaseConfig.database).collection('threads');
    const total = await threadsCollection.countDocuments();
    this.#closeMongoClient();
    return total;
  };

  getThreads = async (limit, skip) => {
    await this.#connectMongoClient();
    const threadsCollection = this.client.db(databaseConfig.database).collection('threads');
    const threads = await threadsCollection.find({}, { limit, skip }).toArray();
    this.#closeMongoClient();
    return threads;
  };
}

module.exports = new DatabaseController();
