const jwt = require('jsonwebtoken');
const ServiceHelper = require('../services/service-helper');
const config = require('../config');
const protectedRoutes = require('../enums/protected-routes');

class TokenHandler {
  signToken = user => {
    return new Promise((resolve, reject) => {
      jwt.sign(user, 'token secret', { expiresIn: config.tokenExpirationTime }, (err, token) => {
        if (err) reject(err);
        resolve(token);
      });
    });
  };

  verifyToken = async (request, response, next) => {
    if (!this.#isProtectedRoute(request.originalUrl)) {
      return next();
    }

    try {
      const token = this.#getToken(request);
      await this.#performVerification(token);
      next();
    } catch (error) {
      this.#handleErrorResponse(error, response);
    }
  };

  #isProtectedRoute = url => {
    return protectedRoutes.includes(url);
  };

  #getToken = request => {
    if (!request.headers['authorization']) {
      throw new Error('h');
    }
    const token = request.headers['authorization'].split(' ')[1];
    const rule = new RegExp('[^a-z0-9._-]', 'ig');
    const tokenIsValid = !rule.test(token.trim());

    if (tokenIsValid) {
      return token;
    }

    throw new Error('invalid token');
  };

  #performVerification = token => {
    return new Promise((resolve, reject) => {
      jwt.verify(token, 'token secret', (err, tokenData) => {
        if (err) {
          reject(err);
        }
        resolve(tokenData);
      });
    });
  };

  #handleErrorResponse = (error, response) => {
    const errorMessage = this.#getErrorMessage(error);
    response.status(403).json(ServiceHelper.formatErrorResponse(errorMessage));
  };

  #getErrorMessage = ({ message }) => {
    switch (message) {
      case 'invalid token':
        return 'Provided token is invalid.';
      case 'jwt expired':
        return 'Provided token has expired.';
      case 'h':
        return 'Missing authorization header.';
      default:
        return 'An error occured relating web token.';
    }
  };
}

module.exports = new TokenHandler();
