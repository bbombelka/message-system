const { MongoClient, ObjectId } = require('mongodb');
const databaseConfig = require('./database-config.js');
const DatabaseError = require('./database-error');
const dbError = require('../enums/db-errors');
const EventEmitter = require('events');
const bool = require('../enums/boolean');
const redisClient = require('../services/redis');
const {
  MESSAGE_ADDED,
  MESSAGE_DELETED,
  MESSAGE_MODIFIED,
  MESSAGES_SENT,
  THREAD_MODIFIED,
} = require('../enums/events.enum');
const { cacheIsDisabled } = require('../config');

class DatabaseController extends EventEmitter {
  constructor() {
    super();
    this.#attachListeners();
  }

  #adjustCache = ({ event, data }) => {
    const { user_id, ref } = data;
    const pattern = event === THREAD_MODIFIED ? `${user_id}/getthreads*` : `${user_id}/getmessages/${ref}/*`;

    redisClient.scan('0', 'MATCH', pattern, 'COUNT', '100', (err, [_, keys]) => {
      keys.forEach((key) => redisClient.del(key, (err, number) => console.log(err, number)));
    });
  };

  #attachListeners = () => {
    this.on(MESSAGE_ADDED, (threadId) => this.#onAddedMessage(threadId));
    this.on(MESSAGE_DELETED, (threadId, deletedCount) => this.#onDeletedMessage(threadId, deletedCount));
    this.on(MESSAGES_SENT, (messagesDetails) => this.#onSentMessages(messagesDetails));
    this.on(
      THREAD_MODIFIED,
      (user_id) => !cacheIsDisabled && this.#adjustCache({ event: THREAD_MODIFIED, data: { user_id } })
    );
    this.on(MESSAGE_MODIFIED, (data) => !cacheIsDisabled && this.#adjustCache({ event: MESSAGE_MODIFIED, data }));
  };

  #connectMongoClient = async () => {
    this.client = new MongoClient(databaseConfig.uri, { useUnifiedTopology: true });
    await this.client.connect();
  };

  #closeMongoClient = () => {
    this.client.close();
  };

  #throwError = (errorMessage, statusCode) => {
    throw new DatabaseError(errorMessage, statusCode);
  };

  #getCollection = (collectionName) => {
    return this.client.db(databaseConfig.database).collection(collectionName);
  };

  #onAddedMessage = async (id) => {
    await this.#connectMongoClient();
    const threads = this.#getCollection('threads');
    await threads.updateOne({ _id: ObjectId(id) }, { $set: { date: new Date() }, $inc: { nummess: 1 } });
    this.#closeMongoClient();
  };

  #onDeletedMessage = async (id, deletedCount) => {
    await this.#connectMongoClient();
    const threads = this.#getCollection('threads');
    await threads.findOneAndUpdate(
      { _id: ObjectId(id) },
      { $inc: { nummess: -deletedCount } },
      { returnOriginal: false }
    );
    this.#closeMongoClient();
  };

  #onSentMessages = async ({ messagesIds, threadId, totalMessageNumber }) => {
    await this.#connectMongoClient();
    const messages = this.#getCollection('messages');
    const { modifiedCount } = await messages.updateMany({ _id: { $in: messagesIds } }, { $set: { read: bool.TRUE } });
    this.#closeMongoClient();
    this.#changeUnreadCount(modifiedCount, threadId, totalMessageNumber);
  };

  #changeUnreadCount = async (numberOfReadMessages, threadId, totalMessageNumber) => {
    await this.#connectMongoClient();
    const threads = this.#getCollection('threads');

    const { value, lastErrorObject } = await threads.findOneAndUpdate(
      { _id: ObjectId(threadId) },
      { $inc: { unreadmess: -numberOfReadMessages } },
      { returnOriginal: false }
    );

    this.#closeMongoClient();

    if (value.unreadmess === 0) {
      this.#markThreadAsRead(threadId);
    }

    if (value.unreadmess < 0) {
      this.#checkThreadMessageNumberSync(value, totalMessageNumber);
    }

    if (!lastErrorObject.ok) {
      // perform check if thread data is in sync with messages state
    }
  };

  #markThreadAsRead = async (threadId) => {
    await this.#connectMongoClient();
    const threads = this.#getCollection('threads');
    await threads.updateOne({ _id: ObjectId(threadId) }, { $set: { read: bool.TRUE } });
    this.#closeMongoClient();
  };

  #checkThreadMessageNumberSync = async (thread, totalMessageNumber) => {
    await this.#connectMongoClient();
    const messages = this.#getCollection('messages');
    const numberOfUnreadMessages = await messages.find({ thread_id: thread._id, read: bool.FALSE }).count();
    const { unreadmess, nummess } = thread;
    const newnummessValue = totalMessageNumber === nummess ? nummess : totalMessageNumber;
    const newUnreadmessValue = numberOfUnreadMessages === unreadmess ? unreadmess : numberOfUnreadMessages;
    const newReadValue = newUnreadmessValue === 0 ? bool.TRUE : bool.FALSE;
    const threads = this.#getCollection('threads');

    await threads.findOneAndUpdate(
      { _id: thread._id },
      { $set: { nummess: newnummessValue, unreadmess: newUnreadmessValue, read: newReadValue } }
    );

    this.#closeMongoClient();
  };

  getThreadNumber = async (user_id) => {
    await this.#connectMongoClient();
    const threadsCollection = this.#getCollection('threads');
    const total = await threadsCollection.countDocuments({ user_id });
    this.#closeMongoClient();
    return total;
  };

  getThreads = async (user_id, limit, skip) => {
    await this.#connectMongoClient();
    const threadsCollection = this.#getCollection('threads');
    const threads = await threadsCollection.find({ user_id }, { limit, skip }).sort({ date: -1 }).toArray();
    this.#closeMongoClient();

    return threads;
  };

  getMessageNumber = async (id) => {
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const total = await messagesCollection.countDocuments({ thread_id: id });
    this.#closeMongoClient();
    return total;
  };

  getMessages = async ({ threadIds, limit = 0, skip = 0 }) => {
    await this.#connectMongoClient();
    const cursor = this.client
      .db(databaseConfig.database)
      .collection('messages')
      .find({ thread_id: { $in: threadIds } });

    const totalMessages = await cursor.count();

    if (!totalMessages) {
      this.#throwError(dbError.EMPTY_THREAD, 404);
    } else if (skip >= totalMessages) {
      this.#throwError(dbError.WRONG_SKIP, 422);
    }
    const messages = await cursor.limit(limit).skip(skip).sort({ date: -1 }).toArray();
    this.#closeMongoClient();
    return { messages, total: totalMessages };
  };

  deleteThread = async (idArray, options = {}, user_id) => {
    await this.#connectMongoClient();
    const { lastMessageDeleted = false } = options;
    const { deletedCount } = await this.client
      .db(databaseConfig.database)
      .collection('threads')
      .deleteMany({ _id: { $in: idArray } });

    if (deletedCount === 0) {
      this.#throwError(dbError.THREAD_NOT_FOUND, 404);
    }

    this.#closeMongoClient();
    if (!lastMessageDeleted) {
      this.#deleteMessages(idArray);
    }

    this.emit(THREAD_MODIFIED, user_id);
  };

  #deleteMessages = async (idArray) => {
    const threadIds = idArray.map((id) => id.toString());
    const query = { thread_id: { $in: threadIds } };
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const numberOfMessagesToDelete = await messagesCollection.countDocuments(query);

    if (numberOfMessagesToDelete === 0) {
      // only log inconsistency, irrelevant for user
    }

    const { deletedCount } = await messagesCollection.deleteMany(query);

    if (numberOfMessagesToDelete !== deletedCount) {
      // log incosistency, irrelevant for user
    }
    this.#closeMongoClient();
  };

  deleteMessage = async (idArray) => {
    await this.#connectMongoClient();
    const messages = this.client.db(databaseConfig.database).collection('messages');
    const cursor = messages.find({ _id: { $in: idArray } }).map(({ thread_id }) => thread_id);
    const threadsId = await cursor.toArray();
    const threadId = threadsId.pop();
    const { deletedCount } = await messages.deleteMany({ _id: { $in: idArray } });

    if (deletedCount === 0) {
      this.#throwError(dbError.MESSAGE_NOT_FOUND, 404);
    }

    this.#closeMongoClient();
    this.emit(MESSAGE_DELETED, threadId, deletedCount);
    return threadId;
  };

  addToCollection = async (item, collectionName) => {
    await this.#connectMongoClient();
    const itemCollection = this.#getCollection(collectionName);
    const { insertedCount, ops } = await itemCollection.insertOne(item);
    const insertedItem = ops[0];

    if (insertedCount === 0) {
      this.#throwError('Item has not been persisted to the database.', 500);
    }
    if (insertedItem._id !== item._id) {
      await itemCollection.deleteOne({ _id: insertedId });
      this.#throwError('Item has not been persisted to the database.', 500);
    }

    this.#closeMongoClient();

    if (collectionName === 'messages') {
      this.emit(MESSAGE_ADDED, item.thread_id);
    }
    return insertedItem;
  };

  addAttachmentBinary = async (attachmentDocument) => {
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
      }
    );

    if (matchedCount === 0) {
      this.#throwError(dbError.MESSAGE_NOT_FOUND, 404);
    }

    if (modifiedCount === 0) {
      this.#throwError(dbError.ATTACH_NOT_SAVED, 500);
    }
    this.#closeMongoClient();
  };

  getAttachment = async (id) => {
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

  getAllAttachments = async (id) => {
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const messageWithAttachments = await messagesCollection.findOne({ _id: ObjectId(id) });
    if (messageWithAttachments === null) {
      this.#throwError(dbError.MESSAGE_NO_ATTACH, 404);
    }
    this.#closeMongoClient();
    return messageWithAttachments.attach;
  };

  getAllAttachmentsBinaries = async (id) => {
    await this.#connectMongoClient();
    const attachmentCollection = this.#getCollection('attachments');
    const cursor = attachmentCollection.find({ message_id: id });

    if (!(await cursor.hasNext())) {
      this.#closeMongoClient();
      this.#throwError(dbError.ATTACH_NOT_FOUND, 404);
    }

    const result = await cursor.toArray();
    this.#closeMongoClient();
    return result;
  };

  deleteAttachmentBinary = async (id) => {
    await this.#connectMongoClient();
    const attachmentCollection = this.#getCollection('attachments');
    const { value } = await attachmentCollection.findOneAndDelete({ _id: ObjectId(id) });
    this.#closeMongoClient();
    if (value === null || !value.message_id) {
      this.#throwError(dbError.ATTACH_NOT_FOUND, 404);
    }
    return value;
  };

  deleteAttachmentDetails = async (id, ref) => {
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const { matchedCount, modifiedCount } = await messagesCollection.updateOne(
      { _id: ObjectId(id) },
      { $pull: { attach: { ref } } }
    );
    if (matchedCount === 0) {
      this.#throwError(dbError.MESSAGE_NO_ATTACH, 404);
    }

    if (modifiedCount === 0) {
      this.#throwError(dbError.ATTACH_NOT_DELETED, 500);
    }
    this.#closeMongoClient();
  };

  updateMessage = async (id, text) => {
    await this.#connectMongoClient();
    const messagesCollection = this.#getCollection('messages');
    const cursor = messagesCollection.find({ _id: ObjectId(id) });

    if ((await cursor.count()) !== 1) {
      this.#throwError(dbError.MESSAGE_NOT_FOUND, 404);
    }

    if (!(await cursor.filter({ processed: 'F' }).hasNext())) {
      this.#throwError(dbError.MESSAGE__NO_EDIT, 400);
    }
    cursor.close();

    const { value } = await messagesCollection.findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: { lastUpdated: new Date(), text } },
      { returnOriginal: false }
    );

    if (value === null) {
      this.#throwError(dbError.MESSAGE_NOT_UPDATED, 500);
    }

    this.#closeMongoClient();
    return value;
  };

  getUser = async (login) => {
    await this.#connectMongoClient();
    const usersCollection = this.#getCollection('users');
    const user = await usersCollection.findOne({ login });
    this.#closeMongoClient();
    if (!user) {
      this.#throwError('User with that login does not exist.');
    }
    return user;
  };
}

module.exports = new DatabaseController();
