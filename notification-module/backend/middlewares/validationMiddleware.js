const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => {
      return req.body[field] === undefined || req.body[field] === null || String(req.body[field]).trim() === "";
    });

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Validation Failed. Missing required fields: ${missing.join(", ")}`
      });
    }
    next();
  };
};

module.exports = validateBody;
