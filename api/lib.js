require('dotenv').config();
const IORedis = require('ioredis');
const { Queue } = require('bullmq');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisConfig = new URL(redisUrl);
const connectionOptions = {
  host: redisConfig.hostname,
  port: Number(redisConfig.port || 6379),
  username: redisConfig.username || undefined,
  password: redisConfig.password || undefined,
  db: redisConfig.pathname && redisConfig.pathname !== '/' ? Number(redisConfig.pathname.slice(1)) : 0,
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  retryStrategy: times => Math.min(times * 150, 2000)
};

const knownQueuesKey = 'scheduler:queues';
const defaultQueues = (process.env.WORKER_QUEUES || 'default,critical,email,reports')
  .split(',')
  .map(q => q.trim())
  .filter(Boolean);

function redis() {
  const client = new IORedis(redisUrl, connectionOptions);
  client.on('error', () => {});
  return client;
}

const queueCache = new Map();
function queue(name) {
  if (!queueCache.has(name)) {
    const q = new Queue(name, { connection: connectionOptions });
    q.on('error', () => {});
    queueCache.set(name, q);
  }
  return queueCache.get(name);
}

async function queueNames(client) {
  try {
    const fromRedis = await client.smembers(knownQueuesKey);
    const union = Array.from(new Set([...defaultQueues, ...fromRedis]));
    return union.length ? union : ['default'];
  } catch {
    return defaultQueues;
  }
}

async function rememberQueue(client, name) {
  if (name) {
    try {
      await client.sadd(knownQueuesKey, name);
    } catch {}
  }
}

async function publish(client, type, data) {
  const payload = {
    type,
    timestamp: new Date().toISOString(),
    data
  };
  try {
    await client.publish('scheduler:events', JSON.stringify(payload));
  } catch {}
  return payload;
}

function asNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

module.exports = {
  redisUrl,
  connectionOptions,
  redis,
  queue,
  queueNames,
  rememberQueue,
  publish,
  asNumber
};
