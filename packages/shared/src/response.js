"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.error = error;
exports.paginated = paginated;
const error_codes_1 = require("./error-codes");
function success(data, meta) {
    return {
        code: error_codes_1.ErrorCodes.SUCCESS,
        message: error_codes_1.ErrorMessages[error_codes_1.ErrorCodes.SUCCESS],
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta,
        },
    };
}
function error(code, message, errors) {
    return {
        code,
        message: message || error_codes_1.ErrorMessages[code] || '未知错误',
        data: null,
        meta: {
            timestamp: new Date().toISOString(),
            ...(errors ? { errors } : {}),
        },
    };
}
function paginated(items, total, page, pageSize) {
    return {
        code: error_codes_1.ErrorCodes.SUCCESS,
        message: error_codes_1.ErrorMessages[error_codes_1.ErrorCodes.SUCCESS],
        data: items,
        meta: {
            timestamp: new Date().toISOString(),
            page,
            pageSize,
            total,
        },
    };
}
//# sourceMappingURL=response.js.map