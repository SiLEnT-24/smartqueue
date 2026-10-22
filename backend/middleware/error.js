exports.notFound = (req, res) => res.status(404).json({ message: 'Route not found' });
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map(e => e.message).join(', '); }
  if (err.name === 'CastError') { status = 400; message = 'Invalid ID'; }
  if (err.code === 11000) { status = 409; message = 'Duplicate value: that record already exists'; }
  if (status === 500) { console.error(err); message = 'Server error. Please try again.'; }
  res.status(status).json({ message });
};
