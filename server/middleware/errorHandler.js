// Multer throws its own error class for file-size/type issues before a
// route handler ever runs — that's a client mistake (400), not a server
// fault, but the raw error carries no `.status` to say so.
function isMulterError(err) {
  return err?.name === 'MulterError';
}

const GENERIC_MESSAGE = 'Something went wrong, please try again';

export function errorHandler(err, req, res, next) {
  if (isMulterError(err)) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 5MB' : 'File upload failed';
    return res.status(400).json({ message });
  }

  // A malformed id in a URL param (bad ObjectId) is a client mistake, not a
  // server fault — same class of problem as the Multer case above.
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'That ID is not valid' });
  }

  const status = err.status || 500;

  if (status >= 500) {
    // err.message here is whatever the underlying failure said — a Mongo
    // driver string, a third-party SDK's own wording, a stack-trace
    // fragment. That's fine in the server log; it must never reach a
    // customer's screen, so every 5xx gets the same safe, generic message
    // regardless of what actually broke.
    console.error(err);
    return res.status(status).json({ message: GENERIC_MESSAGE });
  }

  // Below 500, err.message is always something *we* wrote deliberately via
  // AppError specifically to be shown to the user — safe to pass through.
  res.status(status).json({ message: err.message || GENERIC_MESSAGE });
}
