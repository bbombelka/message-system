const bool = require('../enums/boolean');

module.exports = {
  client: ({ ref, title, date, text, read, attachments, type, processed, lastUpdated }) => {
    return {
      ref,
      title,
      text,
      date,
      read,
      attach: [] || attachments,
      processed: type === 'I' ? undefined : processed,
      lastUpdated,
    };
  },
  database: ({ _id, thread_id, title, text, attach, type }) => {
    return {
      _id,
      thread_id,
      title,
      text,
      date: _id.getTimestamp(),
      read: bool.TRUE,
      attach: attach || [],
      type,
      processed: bool.FALSE,
      login: 'Barty-boy',
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
