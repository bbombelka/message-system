class DatabaseError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.type = 'db';
    this.statusCode = statusCode;
  }
}

module.exports = DatabaseError;
