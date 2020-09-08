const redis = require('redis');
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const RedisServer = require('redis-server');
const { resolve } = require('path');

const server = new RedisServer({
  port: REDIS_PORT,
  bin: resolve('./redis/redis-server'),
});

server.open(() => {});

const redisClient = redis.createClient(REDIS_PORT, null, {
  max_attempts: 5,
  retry_max_delay: 100,
});

redisClient.on('connect', () => console.log('redis connected'));

module.exports = redisClient;
