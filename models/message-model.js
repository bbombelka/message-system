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
};
