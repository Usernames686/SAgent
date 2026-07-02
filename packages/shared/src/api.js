"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessages = exports.ErrorCode = void 0;
exports.success = success;
exports.error = error;
exports.paginated = paginated;
exports.ErrorCode = {
    SUCCESS: 0,
    TOKEN_EXPIRED: 1001,
    TOKEN_INVALID: 1002,
    PERMISSION_DENIED: 1003,
    UNAUTHORIZED: 1004,
    USER_NOT_FOUND: 2001,
    USER_EMAIL_EXISTS: 2002,
    PASSWORD_WRONG: 2003,
    USER_DISABLED: 2004,
    COURSE_NOT_FOUND: 3001,
    EXERCISE_NOT_FOUND: 3002,
    KNOWLEDGE_POINT_NOT_FOUND: 3003,
    LEARNING_PATH_NOT_FOUND: 3004,
    SUBMISSION_NOT_FOUND: 3005,
    EXEC_TIMEOUT: 4001,
    MEMORY_LIMIT: 4002,
    SANDBOX_ERROR: 4003,
    AGENT_UNAVAILABLE: 5001,
    LLM_TIMEOUT: 5002,
    LLM_RATE_LIMIT: 5003,
    AGENT_INVALID_RESPONSE: 5004,
    INTERNAL_ERROR: 9001,
    SERVICE_UNAVAILABLE: 9002,
    BAD_REQUEST: 9003,
    VALIDATION_ERROR: 9004,
};
exports.ErrorMessages = {
    [exports.ErrorCode.SUCCESS]: 'success',
    [exports.ErrorCode.TOKEN_EXPIRED]: 'Token 已过期',
    [exports.ErrorCode.TOKEN_INVALID]: 'Token 无效',
    [exports.ErrorCode.PERMISSION_DENIED]: '权限不足',
    [exports.ErrorCode.UNAUTHORIZED]: '未授权访问',
    [exports.ErrorCode.USER_NOT_FOUND]: '用户不存在',
    [exports.ErrorCode.USER_EMAIL_EXISTS]: '邮箱已注册',
    [exports.ErrorCode.PASSWORD_WRONG]: '密码错误',
    [exports.ErrorCode.USER_DISABLED]: '用户已被禁用',
    [exports.ErrorCode.COURSE_NOT_FOUND]: '课程不存在',
    [exports.ErrorCode.EXERCISE_NOT_FOUND]: '练习不存在',
    [exports.ErrorCode.KNOWLEDGE_POINT_NOT_FOUND]: '知识点不存在',
    [exports.ErrorCode.LEARNING_PATH_NOT_FOUND]: '学习路径不存在',
    [exports.ErrorCode.SUBMISSION_NOT_FOUND]: '提交记录不存在',
    [exports.ErrorCode.EXEC_TIMEOUT]: '执行超时',
    [exports.ErrorCode.MEMORY_LIMIT]: '内存超限',
    [exports.ErrorCode.SANDBOX_ERROR]: '沙箱执行错误',
    [exports.ErrorCode.AGENT_UNAVAILABLE]: 'Agent 不可用',
    [exports.ErrorCode.LLM_TIMEOUT]: 'LLM 响应超时',
    [exports.ErrorCode.LLM_RATE_LIMIT]: 'LLM 请求频率超限',
    [exports.ErrorCode.AGENT_INVALID_RESPONSE]: 'Agent 返回异常',
    [exports.ErrorCode.INTERNAL_ERROR]: '内部错误',
    [exports.ErrorCode.SERVICE_UNAVAILABLE]: '服务不可用',
    [exports.ErrorCode.BAD_REQUEST]: '请求参数错误',
    [exports.ErrorCode.VALIDATION_ERROR]: '数据校验失败',
};
function success(data, meta) {
    return {
        code: exports.ErrorCode.SUCCESS,
        message: exports.ErrorMessages[exports.ErrorCode.SUCCESS],
        data,
        meta: {
            requestId: '',
            timestamp: new Date().toISOString(),
            ...meta,
        },
    };
}
function error(code, message, errors) {
    return {
        code,
        message: message || exports.ErrorMessages[code] || '未知错误',
        errors,
        meta: { requestId: '', timestamp: new Date().toISOString() },
    };
}
function paginated(items, total, page, pageSize) {
    return success(items, { page, pageSize, total });
}
//# sourceMappingURL=api.js.map