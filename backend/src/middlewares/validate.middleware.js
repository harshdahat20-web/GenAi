const ApiError = require("../utils/ApiError");

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body });
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.slice(1).join(".")}: ${i.message}`)
      .join(", ");
    return next(new ApiError(400, message));
  }
  req.body = result.data.body;
  next();
};

module.exports = validate;
