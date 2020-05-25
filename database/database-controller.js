const { MongoClient, ObjectId, Binary } = require('mongodb');
const databaseConfig = require('./database-config.js');
const DatabaseError = require('./database-error');
const dbError = require('../enums/db-errors');
const EventEmitter = require('events');
const bool = require('../enums/boolean');

class DatabaseController extends EventEmitter {
  constructor() {
    super();
    this.#attachListeners();
  }

  #attachListeners = () => {
    this.on('message-added', threadId => this.#onAddedMessage(threadId));
    this.on('message-deleted', threadId => this.#onDeletedMessage(threadId));
    this.on('messages-sent', messagesDetails => this.#onSentMessages(messagesDetails));
  };

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

  #onAddedMessage = async id => {
    await this.#connectMongoClient();
    const threads = this.#getCollection('threads');
    await threads.updateOne({ _id: ObjectId(id) }, { $inc: { nummess: 1 } });
    this.#closeMongoClient();
  };

  #onDeletedMessage = async id => {
    await this.#connectMongoClient();
    const threads = this.#getCollection('threads');
    await threads.updateOne({ _id: ObjectId(id) }, { $inc: { nummess: -1 } });
    this.#closeMongoClient();
  };

  #onSentMessages = async ({ messagesIds, threadId }) => {
    await this.#connectMongoClient();
    const messages = this.#getCollection('messages');
    const { modifiedCount } = await messages.updateMany(
      { read: bool.FALSE, _id: { $in: messagesIds } },
      { $set: { read: bool.TRUE } },
    );
    this.#closeMongoClient();
    this.#changeUnreadCount(modifiedCount, threadId);
  };

  #changeUnreadCount = async (readMessages, threadId) => {
    await this.#connectMongoClient();
    const threads = this.#getCollection('threads');

    const { value, lastErrorObject } = await threads.findOneAndUpdate(
      { _id: ObjectId(threadId) },
      { $inc: { unreadmess: -readMessages } },
      { returnOriginal: false },
    );

    this.#closeMongoClient();
    if (value.unreadmess === 0) {
      this.#markThreadAsRead(threadId);
    }
    if (!lastErrorObject.ok) {
      // perform check if thread data is in sync with messages state
    }
  };

  #markThreadAsRead = async threadId => {
    await this.#connectMongoClient();
    const threads = this.#getCollection('threads');
    await threads.updateOne({ _id: ObjectId(threadId) }, { $set: { read: bool.TRUE } });
    this.#closeMongoClient();
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

  getMessages = async ({ id, limit = 0, skip = 0 }) => {
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
    this.emit('message-deleted', value.thread_id);
    return value.thread_id;
  };

  addToCollection = async (item, collectionName) => {
    await this.#connectMongoClient();
    const itemCollection = this.#getCollection(collectionName);
    const { insertedCount, insertedId } = await itemCollection.insertOne(item);
    if (insertedCount === 0) {
      this.#throwError('Item has not been persisted to the database.', 500);
    }
    if (insertedId !== item._id) {
      await itemCollection.deleteOne({ _id: insertedId });
      this.#throwError('Item has not been persisted to the database.', 500);
    }
    this.#closeMongoClient();

    if (collectionName === 'messages') {
      this.emit('message-added', item.thread_id);
    }

    return insertedId;
  };

  addAttachmentBinary = async attachmentDocument => {
    await this.#connectMongoClient();
    const attachmentCollection = this.#getCollection('attachments');
    const { insertedCount } = await attachmentCollection.insertOne(attachmentDocument);
    if (insertedCount === 0) {
      this.#throwError(dbError.ATTACH_NOT_SAVED, 500);
    }
    this.#closeMongoClient();
  };

  appendAttachmentToMessage = async (attachmentSubdocument, id) => {
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const { matchedCount, modifiedCount } = await messagesCollection.updateOne(
      { _id: ObjectId(id) },
      {
        $push: {
          attach: attachmentSubdocument,
        },
      },
    );

    if (matchedCount === 0) {
      this.#throwError(dbError.MESSAGE_NOT_FOUND, 404);
    }

    if (modifiedCount === 0) {
      this.#throwError(dbError.ATTACH_NOT_SAVED, 500);
    }
    this.#closeMongoClient();
  };

  getAttachment = async id => {
    await this.#connectMongoClient();
    const attachmentCollection = this.#getCollection('attachments');
    const attachment = await attachmentCollection.findOne({ _id: ObjectId(id) });
    if (attachment === null) {
      this.#throwError(dbError.ATTACH_NOT_FOUND, 404);
    }
    this.#closeMongoClient();
    return attachment;
  };

  getAttachmentDetails = async (messageId, ref) => {
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const cursor = messagesCollection.aggregate([
      { $match: { _id: ObjectId(messageId) } },
      {
        $project: {
          attach: {
            $filter: {
              input: '$attach',
              as: 'attachment',
              cond: {
                $eq: ['$$attachment.ref', ref],
              },
            },
          },
        },
      },
    ]);

    if (!(await cursor.hasNext())) {
      this.#closeMongoClient();
      this.#throwError(dbError.ATTACH_NOT_FOUND, 404);
    }

    const [result] = await cursor.toArray();
    this.#closeMongoClient();
    if (result.attach.length) {
      return result.attach[0];
    } else {
      this.#throwError(dbError.ATTACH_NOT_FOUND, 404);
    }
  };

  deleteAttachmentBinary = async id => {
    this.#connectMongoClient();
    const attachmentCollection = this.#getCollection('attachments');
    const { value } = await attachmentCollection.findOneAndDelete({ _id: ObjectId(id) });
    this.#closeMongoClient();
    if (value === null || !value.message_id) {
      this.#throwError(dbError.ATTACH_NOT_FOUND, 404);
    }
    return value;
  };

  deleteAttachmentDetails = async (id, ref) => {
    this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const { matchedCount, modifiedCount } = await messagesCollection.updateOne(
      { _id: ObjectId(id) },
      { $pull: { attach: { ref } } },
    );
    if (matchedCount === 0) {
      this.#throwError(dbError.MESSAGE_NO_ATTACH, 404);
    }

    if (modifiedCount === 0) {
      this.#throwError(dbError.ATTACH_NOT_DELETED, 500);
    }
    this.#closeMongoClient();
  };
}

module.exports = new DatabaseController();
