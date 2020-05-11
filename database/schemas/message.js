module.exports = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      additionalProperties: false,
      required: ['_id, thread_id', 'title', 'text', 'date', 'read', 'attach', 'type', 'processed'],
      properties: {
        _id: {
          bsonType: 'objectId',
          description: 'objectId is required',
        },
        thread_id: {
          bsonType: 'string',
          description: 'hexadecimal string of 24 characters',
          minLength: 24,
          maxLength: 24,
        },
        title: {
          bsonType: 'string',
          description: 'message title is required and must have between 5 and 50 characters',
          minLength: 5,
          maxLength: 50,
        },
        text: {
          bsonType: 'string',
          description: 'message title is required and must have between 50 and 5000 characters',
          minLength: 50,
          maxLength: 5000,
        },
        date: {
          bsonType: 'date',
          description: 'date of message creation is required',
        },
        read: {
          enum: ['T', 'F'],
          description: 'message could be either read (T) or not (F)',
        },
        attach: {
          bsonType: 'array',
          description: 'array containing attachments is required and can contain only objects',
          items: {
            type: 'object',
          },
          maxItems: 5,
          additionalItems: false,
        },
        type: {
          enum: ['O', 'I'],
          description: 'message can be either I or O',
        },
        processed: {
          enum: ['T', 'F'],
          description: 'message can be either processed (T) or not (F)',
        },
      },
    },
  },
};
