import type { HydratedDocument } from 'mongoose';
import type { Session, User } from '../models';

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth: {
        session: HydratedDocument<Session> | null;
        user: HydratedDocument<User> | null;
      };
    }
  }
}

export {};
