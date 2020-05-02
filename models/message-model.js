module.exports = {
  parse: ({ ref, title, date, txt, read, attachments }) => {
    return {
      ref,
      title,
      txt,
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
      read: 'T',
      attach: attach || [],
    };
  },
};
