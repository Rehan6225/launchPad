/** Tiny helpers so route handlers stay thin and consistent. */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wraps an async handler so rejections reach the error middleware. */
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function required(body, fields) {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === '',
  );
  if (missing.length) {
    throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
  }
}

function oneOf(value, allowed, field) {
  if (value !== undefined && !allowed.includes(value)) {
    throw new HttpError(400, `Invalid ${field}. Expected one of: ${allowed.join(', ')}`);
  }
}

const nullable = (value) => (value === '' || value === undefined ? null : value);

module.exports = { HttpError, asyncRoute, required, oneOf, nullable };
