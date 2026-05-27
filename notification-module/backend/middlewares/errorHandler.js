const errorHandler = (err, req, res, next) => {
  console.error("--- GLOBAL API ERROR ---");
  console.error(err.stack || err);
  console.error("------------------------");

  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected system error occurred on the server.";

  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};

module.exports = errorHandler;
