class CutstomizedError extends Error {
  constructor(message, type, statusCode) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
  }
}

module.exports = CutstomizedError;
