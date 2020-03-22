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

  static getTextedMessages(messages) {
    let result = '';

    messages.forEach(({ date, title, txt, read }) => {
      const messageBody = `
            Wiadomość z ${date}.
            ${read === 'T' ? 'Przeczytana' : 'Nieprzeczytana'}
            Temat: ${title}
            Treśc wiadomości: 
            ${txt}

        `;
      result += messageBody;
    });

    return result;
  }
}

module.exports = SendInEmailHelper;
