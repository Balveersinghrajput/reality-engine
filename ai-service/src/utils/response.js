const success = (res, data, msg = 'OK', code = 200) => res.status(code).json({ success: true, message: msg, data });
const error   = (res, msg = 'Error', code = 500)    => res.status(code).json({ success: false, message: msg });
module.exports = { success, error };