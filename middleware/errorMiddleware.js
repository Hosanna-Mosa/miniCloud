function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  // Keep server logs clean while still useful for debugging.
  if (statusCode >= 500) {
    console.error('[upload-server] internal error:', err.message);
  } else {
    console.warn('[upload-server] request error:', err.message);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
}

module.exports = {
  notFound,
  errorHandler
};
