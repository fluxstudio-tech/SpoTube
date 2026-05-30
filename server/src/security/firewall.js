const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const RISK_THRESHOLDS = {
  WARNING: 50,
  BAN: 100,
};

const RISK_SCORES = {
  MISSING_ORIGIN: 5,
  INVALID_TOKEN_FORMAT: 10,
  RAPID_FAILED_LOGIN: 20,
  SQLI_PATTERN: 50,
};

function detectSuspiciousPatterns(data) {
  if (!data) return false;
  const str = JSON.stringify(data).toLowerCase();
  const patterns = ['<script>', 'DROP TABLE', 'UNION SELECT', '../'];
  return patterns.some(pattern => str.includes(pattern.toLowerCase()));
}

async function firewallMiddleware(request, reply) {
  const ip = request.ip;
  const key = `fw:ip:${ip}`;
  const banKey = `fw:ban:${ip}`;

  const isBanned = await redis.get(banKey);
  if (isBanned) {
    return reply.status(403).send({ error: 'IP address is entirely blocked due to malicious behavior.' });
  }

  let riskScore = 0;

  if (!request.headers['origin'] && !request.headers['user-agent']) {
    riskScore += RISK_SCORES.MISSING_ORIGIN;
  }

  if (detectSuspiciousPatterns(request.body) || detectSuspiciousPatterns(request.query)) {
    riskScore += RISK_SCORES.SQLI_PATTERN;
    request.log.warn({ payload: request.body, ip }, 'Suspicious payload detected');
  }

  if (riskScore > 0) {
    const currentScore = await redis.incrby(key, riskScore);
    await redis.expire(key, 900);

    if (currentScore >= RISK_THRESHOLDS.BAN) {
      await redis.set(banKey, '1', 'EX', 86400);
      request.log.error({ ip, currentScore }, 'IP banned for excessive risk score');
      return reply.status(403).send({ error: 'Too many malicious requests. Banned for 24 hours.' });
    }
  }
}

module.exports = { firewallMiddleware };
