const { MongoClient, ObjectId } = require('mongodb');
const databaseConfig = require('./database-config.js');
const CustomizedError = require('./common/customized-error');

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

  getMessages = async (id, limit, skip) => {
    await this.#connectMongoClient();
    const cursor = this.client
      .db(databaseConfig.database)
      .collection('messages')
      .find({ thread_id: id });
    const totalMessages = await cursor.count();
    if (!totalMessages) {
      throw new CustomizedError('Invalid reference. No message found in this thread.', 'db', 404);
    } else if (skip >= totalMessages) {
      throw new CustomizedError(
        'Incorrect skip parameter. Number of messages to skip is greater than actual number of messages on server.',
        'db',
        422,
      );
    }
    const messages = await cursor.limit(limit).skip(skip).toArray();
    this.#closeMongoClient();
    return { messages, total: totalMessages };
  };
}

module.exports = new DatabaseController();
