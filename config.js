module.exports = {
  logStorageTimeInDays: 10,
  cacheIsDisabled: false,
  cacheExpiration: 60 * 10, // seconds
  accessTokenExpirationTime: 15, // seconds
  refreshTokenExpirationTime: 30 * 60, // seconds
  tokenSecretPath: './jwt.json',
  dbUriPath: './db.json',
};
