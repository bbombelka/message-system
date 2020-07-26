const redis = require('redis');
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient(REDIS_PORT, null, { max_attempts: 5, retry_max_delay: 100 });
redisClient.on('connect', () => console.log('redis connected'));
redisClient.on('error', error => console.log(error));

module.exports = redisClient;
