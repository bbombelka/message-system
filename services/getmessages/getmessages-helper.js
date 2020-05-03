module.exports = class GetmessagesHelper {
  static payloadHasUnreadMessages = messages => messages.some(({ read }) => read === 'N');
};
