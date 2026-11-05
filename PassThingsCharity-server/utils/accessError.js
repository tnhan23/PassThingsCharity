// Keep `error` for existing clients; `code` is stable for FE branching.
const sendAccessError = (res, status, code, message) =>
    res.status(status).json({ code, message, error: message });

module.exports = { sendAccessError };
