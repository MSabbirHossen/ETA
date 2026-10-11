import type { UserDocument } from '../modules/users/user.model.js';

export interface AuthContext {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      auth?: AuthContext;
    }
  }
}
