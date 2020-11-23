const bool = require('../../enums/boolean');

module.exports = class GetmessagesHelper {
  static payloadHasUnreadMessages = (messages) => messages.some(({ read }) => read === bool.FALSE);
};
