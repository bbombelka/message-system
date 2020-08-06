module.exports = {
  logStorageTimeInDays: 10,
  cacheIsDisabled: false,
  cacheExpiration: 10, // seconds
  accessTokenExpirationTime: 15 * 60, // seconds
  refreshTokenExpirationTime: '24h',
  tokenSecretPath: './jwt.json',
  dbUriPath: './db.json',
};
