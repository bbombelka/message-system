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
  database: ({ _id, title, cu, cd }) => {
    return {
      _id,
      cu: cu || 'T',
      cd: cd || 'T',
      date: _id.getTimestamp(),
      nummess: 1,
      unreadmess: 0,
      type: 'C',
      read: 'T',
      title,
    };
  },
};
