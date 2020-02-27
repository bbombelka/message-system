const ServiceHelper = require('../service-helper');
const DateHelper = require('../../helpers/date-helper');
const ServiceEventEmitter = require('../event-emitter');

class CreateMessageHelper {
  static processRequest({ text, title, ref }) {
    const errors = this.validateContent(text, title);

    if (errors.length) return errors.join(' ');

    const newMessage = this.createNewMessage(text, title);
    const newThread = ref ? null : this.createNewThread(title);
    ref
      ? this.addMessageToExistingThread(ref, newMessage)
      : this.startNewThread(newThread, newMessage);

    return { threadRef: ref || newThread.ref, msgRef: newMessage.ref };
  }

  static validateContent(text, title) {
    const errors = [];
    title.length > 50 ? errors.push('Title can have 50 characters at most.') : null;
    text.length > 5000 ? errors.push('Message text can have 5000 characters at most.') : null;
    return errors;
  }

  static createNewMessage(text, title) {
    return {
      ref: ServiceHelper.hashRef(64),
      read: 'T',
      title,
      txt: text,
      date: DateHelper.getDateForMessage(),
    };
  }

  static addMessageToExistingThread(ref, message) {
    const messageDb = ServiceHelper.getDbData('messages');
    const messageObj = messageDb.filter(messObj => messObj.ref === ref)[0];
    messageObj.msgs.unshift(message);
    messageObj.tot = messageObj.msgs.length;
    ServiceHelper.saveDbData(messageDb, 'messages');
    ServiceEventEmitter.emit('total:message:number:change', messageObj.msgs.length, ref);
  }

  static startNewThread(newThread, newMessage) {
    const threadsDb = ServiceHelper.getDbData('threads');
    threadsDb.unshift(newThread);
    ServiceHelper.saveDbData(threadsDb, 'threads');
    this.startNewMessageObject(newThread.ref, newMessage);
  }

  static createNewThread(title) {
    return {
      ref: ServiceHelper.hashRef(44),
      title,
      cd: 'T',
      date: DateHelper.getDateForMessage(),
      nummess: 1,
      unreadmess: 0,
      type: 'S',
      read: 'T',
    };
  }

  static startNewMessageObject(ref, newMessage) {
    const messageDb = ServiceHelper.getDbData('messages');
    const newMesssageObject = this.createNewMessObj(ref);
    newMesssageObject.msgs.unshift(newMessage);
    messageDb.unshift(newMesssageObject);
    ServiceHelper.saveDbData(messageDb, 'messages');
  }

  static createNewMessObj(ref) {
    return {
      ref,
      tot: 1,
      msgs: [],
    };
  }
}

module.exports = CreateMessageHelper;
