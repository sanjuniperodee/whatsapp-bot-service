export enum TokenType {
  SIGN_UP = 'SIGN_UP',
  REFRESH = 'REFRESH',
  USER = 'USER',
}

export interface JwtPayloadMap {
  [TokenType.SIGN_UP]: {
    phone?: string;
    email?: string;
  };
  [TokenType.USER]: {
    id: string;
    phone?: string;
    email?: string;
  };
  [TokenType.REFRESH]: {
    id: string;
    phone?: string;
    email?: string;
  };
}

export type JwtPayloadPolymorphData<T extends keyof JwtPayloadMap> = JwtPayloadMap[T];

export type StrategyPayload = {
  [P in keyof JwtPayloadMap as Exclude<P, TokenType.SIGN_UP>]: JwtPayloadPolymorphData<P> & {
    tokenType: P;
    expiration: Date;
  };
}[Exclude<TokenType, TokenType.SIGN_UP>];

export type TokenPayloadMap = {
  [P in keyof JwtPayloadMap as Exclude<P, TokenType.SIGN_UP>]: (
    props: JwtPayloadPolymorphData<P> & { tokenType: P; expiration: Date },
  ) => void;
};
