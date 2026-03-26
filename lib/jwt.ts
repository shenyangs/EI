import jwt from 'jsonwebtoken';

// JWT 密钥配置
const JWT_SECRET = process.env.JWT_SECRET;

// 生成 JWT token
export function generateToken(userId: string, email: string): string {
  // 在生产环境中，强制要求设置 JWT_SECRET
  if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
    console.error('❌ 错误：生产环境必须设置 JWT_SECRET 环境变量！');
    console.error('请使用以下命令生成强密钥：');
    console.error('openssl rand -base64 32');
    throw new Error('JWT_SECRET is required in production environment');
  }
  
  const secret = JWT_SECRET || 'temporary-dev-key-' + Math.random().toString(36).substring(2);
  const expiresIn = '24h';
  return jwt.sign({ userId, email }, secret, { expiresIn });
}

// 验证 token
export function validateToken(token: string): { userId: string; email: string } | null {
  // 在生产环境中，强制要求设置 JWT_SECRET
  if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
    return null;
  }
  
  try {
    const secret = JWT_SECRET || 'temporary-dev-key-' + Math.random().toString(36).substring(2);
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    return null;
  }
}
