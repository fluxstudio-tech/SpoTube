const argon2 = require('argon2');
const z = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

module.exports = async function (fastify, opts) {
  const { prisma, redis } = fastify;

  fastify.post('/register', async (request, reply) => {
    const { email, username, password } = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'User already exists' });
    }

    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: { email, username, passwordHash }
    });

    return reply.status(201).send({ message: 'User registered successfully', userId: user.id });
  });

  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const ip = request.ip;

      const isDemo = email === (process.env.DEMO_EMAIL || 'demo@spotube.com') &&
                     password === (process.env.DEMO_PASSWORD || 'demo123');

      let user = null;
      try {
        user = await prisma.user.findUnique({ where: { email } });
      } catch (dbError) {
        if (!isDemo) {
          request.log.error(dbError);
          return reply.status(503).send({ error: 'Veritabanı bağlantısı kurulamadı. Lütfen PostgreSQL ve Redis servislerinin çalıştığından emin olun.' });
        }
      }

      if (isDemo) {
        if (!user) {
          try {
            user = await prisma.user.create({
              data: {
                email,
                username: 'DemoUser',
                passwordHash: await argon2.hash(password),
                role: 'USER',
                isVerified: true
              }
            });
          } catch (createError) {
            user = {
              id: 'demo-uuid-1234',
              email: email,
              username: 'DemoUser',
              role: 'USER'
            };
          }
        }
      } else {
        if (!user || !(await argon2.verify(user.passwordHash, password))) {
          if (redis.status === 'ready') {
            await redis.incrby(`fw:ip:${ip}`, 20);
          }

          await prisma.auditLog.create({
            data: { action: 'LOGIN_FAILED', ipAddress: ip, riskScore: 20, details: { email } }
          }).catch(() => {});

          return reply.status(401).send({ error: 'Geçersiz e-posta veya şifre' });
        }
      }

      const token = fastify.jwt.sign({ id: user.id, username: user.username, role: user.role });
      const refreshToken = fastify.jwt.sign({ id: user.id }, { expiresIn: '7d' });

      if (redis.status === 'ready') {
        await redis.set(`rt:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60).catch(() => {});
      }

      await prisma.auditLog.create({
        data: { userId: user.id, action: 'LOGIN_SUCCESS', ipAddress: ip }
      }).catch(() => {});

      return reply.send({ token, refreshToken, username: user.username });
    } catch (err) {
      request.log.error(err);
      if (err instanceof z.ZodError) throw err;
      return reply.status(500).send({ error: 'Sunucu hatası: ' + err.message });
    }
  });

  fastify.get('/me', {
    preValidation: [async (req, rep) => req.jwtVerify()]
  }, async (request, reply) => {
    return request.user;
  });
};
