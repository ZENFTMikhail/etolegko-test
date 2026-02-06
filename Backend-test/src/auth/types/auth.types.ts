import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
}

export interface LocalUser {
  _id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user: AuthUser | LocalUser;
}
