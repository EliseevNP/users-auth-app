import { Context, Errors } from 'moleculer';
import _ from 'lodash';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload, JsonWebTokenError } from 'jsonwebtoken';
import {
  ActionLink, ActionService, ServiceLink, AUTH_CONFIG,
} from '../../common';
import User from '../models/User';

type TokenPair = { accessToken: string, refreshToken: string };

@ServiceLink({ prefix: 'Auth' })
class AuthService extends ActionService {
  @ActionLink({
    rest: 'POST /signup',
    description: 'Регистрация пользователя',
    params: {
      username: {
        type: 'string',
        optional: false,
        max: 255,
      },
      password: {
        type: 'string',
        optional: false,
        max: 255,
      },
      name: {
        type: 'string',
        optional: true,
        max: 255,
      },
      surname: {
        type: 'string',
        optional: true,
        max: 255,
      },
      patronymic: {
        type: 'string',
        optional: true,
        max: 255,
      },
    },
  })
  public async signup(ctx: Context<{
    username: string,
    password: string,
    name?: string | null,
    surname?: string | null,
    patronymic?: string | null,
  }>): Promise<any> {
    const {
      username,
      password,
      name,
      surname,
      patronymic,
    } = ctx.params;

    const isUsernameAlreadyInUse = !!await User.count({ where: { username } });

    if (isUsernameAlreadyInUse) {
      throw new Errors.MoleculerClientError('username already in use', 400, 'USERNAME_ALREADY_IN_USE')
    }

    const salt = bcrypt.genSaltSync(AUTH_CONFIG.hash.saltRounds);
    const passwordHash = bcrypt.hashSync(password, salt);

    const user = await User.create({
      username,
      passwordHash,
      name,
      surname,
      patronymic,
    });

    return _.omit(user.get({ plain: true }), 'passwordHash');
  }

  @ActionLink({
    rest: 'POST /signin',
    description: 'Логин пользователя',
    params: {
      username: {
        type: 'string',
        optional: false,
        max: 255,
      },
      password: {
        type: 'string',
        optional: false,
        max: 255,
      },
    },
  })
  public async signin(ctx: Context<{
    username: string,
    password: string,
  }>): Promise<TokenPair> {
    const {
      username,
      password,
    } = ctx.params;

    const user = await User.findOne({ where: { username }, attributes: { include: ['passwordHash'] } });

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new Errors.MoleculerClientError('username or password is wrong', 401);
    }

    const tokenPair = this.getTokenPair(user);

    return tokenPair;
  }

  @ActionLink({
    description: 'Проверка accessToken\'а + поиск пользователя в БД',
    params: {
      accessToken: {
        type: 'string',
        optional: false,
      },
    },
  })
  public async resolveToken(ctx: Context<{ accessToken: string }>): Promise<User | null> {
    const decoded = this.verifyToken(ctx.params.accessToken, 'accessToken');
    
    if (!decoded.userId) {
      throw new Errors.MoleculerClientError('userId not found in decoded token', 401);
    }

    const user = await User.findOne({ where: { userId: decoded.userId } });

    if (!user) {
      throw new Errors.MoleculerClientError(`user not found by userId#${decoded.userId} from decoded token`, 401);
    }

    return user;
  }

  @ActionLink({
    description: 'Обновление accessToken\'a и refreshToken\'а',
    params: {
      refreshToken: {
        type: 'string',
        optional: false,
      },
    },
  })
  public async refreshTokens(ctx: Context<{ refreshToken: string }>): Promise<TokenPair> {
    const decoded = this.verifyToken(ctx.params.refreshToken, 'refreshToken');
    const user = await User.findOne({ where: { userId: decoded.userId } });

    if (!user) {
      throw new Errors.MoleculerClientError('user not found while trying to refresh tokens', 401);
    }

    return this.getTokenPair(user);
  }

  private verifyToken(token: string, type: 'accessToken' | 'refreshToken'): JwtPayload {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwt[type].secret, { ...AUTH_CONFIG.jwt.common, complete: true });

    if (decoded.header.alg !== AUTH_CONFIG.jwt.common.algorithm) {
      throw new JsonWebTokenError(`jwt algorithm invalid, expected: ${AUTH_CONFIG.jwt.common.algorithm}`);
    }

    if (typeof decoded.payload === 'string') {
      throw new Error("jwt decoded payload have unexpected 'string' type. expected: 'object'");
    }

    return decoded.payload;
  }

  private getTokenPair(user: User): TokenPair {
    return {
      accessToken: jwt.sign({ userId: user.userId }, AUTH_CONFIG.jwt.accessToken.secret, {
        ...AUTH_CONFIG.jwt.common,
        expiresIn: AUTH_CONFIG.jwt.accessToken.expiresIn,
      }),
      refreshToken: jwt.sign({ userId: user.userId }, AUTH_CONFIG.jwt.refreshToken.secret, {
        ...AUTH_CONFIG.jwt.common,
        expiresIn: AUTH_CONFIG.jwt.refreshToken.expiresIn,
      }),
    };
  }
}

export const authService = new AuthService();
