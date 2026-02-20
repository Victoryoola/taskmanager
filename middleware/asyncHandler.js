/**
 * Async handler wrapper middleware
 * Wraps async route handlers to catch promise rejections and pass them to error handler
 * 
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => {
 *     // async code here
 *   }));
 */

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
