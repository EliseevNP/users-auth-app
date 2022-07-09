import { ServiceSchema } from 'moleculer';
import ApiGateway, { Errors } from 'moleculer-web';

const ApiService: ServiceSchema = {
  name: 'api-gateway',
  mixins: [ApiGateway],
  settings: {
    port: process.env.PORT || 3000,
    routes: [
      {
        path: '/users',
        authorization: true,
        bodyParsers: { json: { limit: '50MB' } },
        aliases: {
          'GET /me': 'v1.services.users-auth.Users.getMe',
          'GET /:id': 'v1.services.users-auth.Users.getById',
          'PATCH /:id': 'v1.services.users-auth.Users.update',
        },
      },
			{
        path: '/auth',
        authorization: false,
        bodyParsers: { json: { limit: '50MB' } },
        aliases: {
          'POST /signup': 'v1.services.users-auth.Auth.signup',
          'POST /signin': 'v1.services.users-auth.Auth.signin',
          'POST /refreshTokens': 'v1.services.users-auth.Auth.refreshTokens',
        },
      },
    ],
  },
  methods: {
		authorize(ctx, _route, req) {
			let token;

			if (req.headers.authorization) {
				let type = req.headers.authorization.split(" ")[0];

				if (type === 'Token') {
					token = req.headers.authorization.split(" ")[1];
				}
			}

			if (!token) {
				return Promise.reject(new Errors.UnAuthorizedError(Errors.ERR_NO_TOKEN, {}));
			}

			// Resolve JWT token
			return ctx.call("v1.services.users-auth.Auth.resolveToken", { accessToken: token })
				.then((user) => {
					if (!user) {
						return Promise.reject(new Errors.UnAuthorizedError(Errors.ERR_INVALID_TOKEN, {}));
          }

					ctx.meta.user = user;
				})
				.catch(() => {
					return Promise.reject(new Errors.UnAuthorizedError(Errors.ERR_INVALID_TOKEN, {}));
				});
		}
	}
};

export = ApiService;
