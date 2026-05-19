import { Redis } from 'ioredis';

let redisClient: Redis | undefined;

export const getRedis = () => {
  redisClient ??= new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/0', {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      return Math.min(times * 200, 2000);
    },
  });

  return redisClient;
};

export const redis = new Proxy({} as Redis, {
  get(_target, property) {
    const client = getRedis();
    const value = Reflect.get(client, property, client) as unknown;

    return typeof value === 'function' ? value.bind(client) : value;
  },
  set(_target, property, value) {
    return Reflect.set(getRedis(), property, value);
  },
});
