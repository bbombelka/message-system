module.exports = {
  logStorageTimeInDays: 10,
  isFileCacheDisabled: true,
  cacheIsDisabled: false,
  cacheExpiration: 60 * 10, // seconds
  accessTokenExpirationTime: 10 * 60, // seconds
  refreshTokenExpirationTime: 30 * 60, // seconds
  tokenSecretPath: './jwt.json',
  dbUriPath: './db.json',
};
