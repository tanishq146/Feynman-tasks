// ─── Error Handler Middleware ────────────────────────────────────────────────
// Catches all unhandled errors and returns a clean JSON response.

export function errorHandler(err, req, res, _next) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    console.error(`❌ [${req.method} ${req.path}] ${status}: ${message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
