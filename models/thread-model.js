const bool = require('../enums/boolean');

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
  database: ({ _id, title, cu, cd, user_id }) => {
    return {
      _id,
      cu: cu || bool.TRUE,
      cd: cd || bool.TRUE,
      date: _id.getTimestamp(),
      nummess: 0,
      unreadmess: 0,
      type: 'C',
      read: bool.TRUE,
      title,
      user_id,
    };
  },
};
