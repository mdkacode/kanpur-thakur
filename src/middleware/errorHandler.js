const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.statusCode = 400;
    error.message = 'Validation Error';
  }

  if (err.name === 'CastError') {
    error.statusCode = 400;
    error.message = 'Invalid ID format';
  }

  if (err.code === '23505') { // PostgreSQL unique constraint violation
    error.statusCode = 409;
    error.message = 'Duplicate entry';
  }

  if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    error.statusCode = 400;
    error.message = 'Referenced record not found';
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
