module.exports = {
  logStorageTimeInDays: 10,
  cacheIsDisabled: false,
  cacheExpiration: 60 * 10, // seconds
  accessTokenExpirationTime: 150 * 60, // seconds
  refreshTokenExpirationTime: '1h',
  tokenSecretPath: './jwt.json',
  dbUriPath: './db.json',
};
