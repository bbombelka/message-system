module.exports = {
  parse: ({ ref, title, cd, date, nummess, unreadmess, type, read }) => {
    return {
      ref,
      title,
      cd,
      date,
      nummess,
      unreadmess,
      type,
      read,
    };
  },
};
