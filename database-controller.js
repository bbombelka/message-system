const { MongoClient, ObjectId } = require('mongodb');
const databaseConfig = require('./database-config.js');
const DatabaseError = require('./common/database-error');
const dbError = require('./enums/db-errors');

class DatabaseController {
  #connectMongoClient = async () => {
    this.client = new MongoClient(databaseConfig.url, { useUnifiedTopology: true });
    await this.client.connect();
  };

  #closeMongoClient = () => {
    this.client.close();
  };

  #throwError = (errorMessage, statusCode) => {
    throw new DatabaseError(errorMessage, statusCode);
  };

  #getCollection = collectionName => {
    return this.client.db(databaseConfig.database).collection(collectionName);
  };

  getThreadNumber = async () => {
    await this.#connectMongoClient();
    const threadsCollection = this.#getCollection('threads');
    const total = await threadsCollection.countDocuments();
    this.#closeMongoClient();
    return total;
  };

  getThreads = async (limit, skip) => {
    await this.#connectMongoClient();
    const threadsCollection = this.#getCollection('threads');
    const threads = await threadsCollection.find({}, { limit, skip }).toArray();
    this.#closeMongoClient();
    return threads;
  };

  getMessageNumber = async id => {
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const total = await messagesCollection.countDocuments({ thread_id: id });
    this.#closeMongoClient();
    return total;
  };

  getMessages = async ({ id, limit, skip }) => {
    await this.#connectMongoClient();
    const cursor = this.client
      .db(databaseConfig.database)
      .collection('messages')
      .find({ thread_id: id });

    const totalMessages = await cursor.count();

    if (!totalMessages) {
      this.#throwError(dbError.EMPTY_THREAD, 404);
    } else if (skip >= totalMessages) {
      this.#throwError(dbError.WRONG_SKIP, 422);
    }
    const messages = await cursor.limit(limit).skip(skip).toArray();
    this.#closeMongoClient();
    return { messages, total: totalMessages };
  };

  deleteThread = async (id, options) => {
    await this.#connectMongoClient();
    const { lastMessageDeleted = false } = options;
    const { deletedCount } = await this.client
      .db(databaseConfig.database)
      .collection('threads')
      .deleteOne({ _id: ObjectId(id) });

    if (deletedCount === 0) {
      this.#throwError(dbError.THREAD_NOT_FOUND, 404);
    }

    this.#closeMongoClient();
    if (!lastMessageDeleted) {
      this.#deleteMessages(id);
    }
  };

  #deleteMessages = async id => {
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const numberOfMessagesToDelete = await messagesCollection.countDocuments({ thread_id: id });

    if (numberOfMessagesToDelete === 0) {
      // only log inconsistency, irrelevant for user
    }

    const { deletedCount } = await messagesCollection.deleteMany({ thread_id: id });

    if (numberOfMessagesToDelete !== deletedCount) {
      // log incosistency, irrelevant for user
    }
    this.#closeMongoClient();
  };

  deleteMessage = async id => {
    await this.#connectMongoClient();
    const { value } = await this.client
      .db(databaseConfig.database)
      .collection('messages')
      .findOneAndDelete({ _id: ObjectId(id) });

    if (!value) {
      this.#throwError(dbError.MESSAGE_NOT_FOUND, 404);
    }
    this.#closeMongoClient();
    return value.thread_id;
  };
}

module.exports = new DatabaseController();
