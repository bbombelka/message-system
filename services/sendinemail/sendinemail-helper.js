const MessageModel = require('../../models/message-model');

class SendInEmailHelper {
  static getEmailBody(messages) {
    const emailBody = `
        Dzień dobry,
        oto treść wiadomości z wątku
        
        ${this.getTextedMessages(messages)}

        z pozdrowieniami 
        zespół obsługi klienta :-) 
        `;

    return emailBody;
  }

  static getTextedMessages = messages =>
    messages.map(message => MessageModel.email(message)).reduce((acc, curr) => acc + curr);
}

module.exports = SendInEmailHelper;
