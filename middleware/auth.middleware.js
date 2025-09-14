import { auth } from "../lib/auth.js";
import { AppError } from "../lib/api-error.js";

export const authenticate = async (req, res, next) => {
  try {
    const response = await auth.api.getSession({
      query: { disableCookieCache: true },
      headers: req.headers,
    });

    if (!response.session) {
      return next(AppError.unauthorized("Unauthorized"));
    }

    req.user = response.user;
    next();
  } catch (error) {
    next(
      AppError.internal("Authentication failed", {
        originalError: error.message,
      })
    );
  }
};

export const authenticateRole = (role) => {
  return async (req, res, next) => {
    try {
      const response = await auth.api.getSession({
        query: { disableCookieCache: true },
        headers: req.headers,
      });

      if (!response.session) {
        return next(AppError.unauthorized("Unauthorized"));
      }

      req.user = response.user;

      if (req.user.role !== role) {
        return next(AppError.forbidden("Forbidden"));
      }

      next();
    } catch (error) {
      next(
        AppError.internal("Authentication failed", {
          originalError: error.message,
        })
      );
    }
  };
};
