import jwt from 'jsonwebtoken';

// 生成JWT token
export function generateToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = '24h';
  return jwt.sign({ userId, email }, secret, { expiresIn });
}

// 验证token
export function validateToken(token: string): { userId: string; email: string } | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    return null;
  }
}
