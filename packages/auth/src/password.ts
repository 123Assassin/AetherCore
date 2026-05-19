import bcrypt from 'bcryptjs';

export const DEFAULT_PASSWORD_COST = 12;

export const hashPassword = (password: string, cost = DEFAULT_PASSWORD_COST) =>
  bcrypt.hash(password, cost);

export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
