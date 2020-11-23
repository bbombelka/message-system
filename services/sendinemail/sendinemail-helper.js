const MessageModel = require('../../models/message-model');

class SendInEmailHelper {
  static getEmailBody(messages) {
    const emailBody = `
       <p><strong>Dzień dobry</strong>,
        oto treść wiadomości z wątku <br><br>
        
        ${this.getTextedMessages(messages)}

        z pozdrowieniami 
        zespół obsługi klienta :-) 
        </p>`;

    return emailBody;
  }

  static getTextedMessages = (messages) =>
    messages.map((message) => MessageModel.email(message)).reduce((acc, curr) => acc + curr);
}

module.exports = SendInEmailHelper;
