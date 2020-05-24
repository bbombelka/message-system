module.exports = {
  databaseDocument: ({ _id, message_id, bin }) => {
    return {
      _id,
      message_id,
      bin,
    };
  },
  databaseSubdocument: ({ ref, name, size, mimetype }) => {
    return {
      ref,
      name,
      size,
      mimetype,
    };
  },
};
