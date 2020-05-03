const bool = require('../enums/boolean');

module.exports = {
  parse: ({ ref, title, date, text, read, attachments }) => {
    return {
      ref,
      title,
      text,
      date,
      read,
      attach: attachments,
    };
  },
  database: ({ _id, thread_id, title, text, attach }) => {
    return {
      _id,
      thread_id,
      title,
      text,
      date: _id.getTimestamp(),
      read: bool.TRUE,
      attach: attach || [],
    };
  },
  email: ({ date, title, text, read }) => `
      <strong>Wiadomość z ${date}.</strong><br>
      <strong>${read === bool.TRUE ? 'Przeczytana' : 'Nieprzeczytana'}</strong><br>
      <strong>Temat: ${title} </strong><br>
      <p>Treść wiadomości: 
      
      ${text}
      </p>`,
};
