export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
    meta: ResponseMeta;
}
export interface ResponseMeta {
    requestId: string;
    timestamp: string;
    page?: number;
    pageSize?: number;
    total?: number;
}
export interface ApiError {
    code: number;
    message: string;
    errors?: FieldError[];
    meta: Pick<ResponseMeta, 'requestId' | 'timestamp'>;
}
export interface FieldError {
    field: string;
    message: string;
}
export declare const ErrorCode: {
    readonly SUCCESS: 0;
    readonly TOKEN_EXPIRED: 1001;
    readonly TOKEN_INVALID: 1002;
    readonly PERMISSION_DENIED: 1003;
    readonly UNAUTHORIZED: 1004;
    readonly USER_NOT_FOUND: 2001;
    readonly USER_EMAIL_EXISTS: 2002;
    readonly PASSWORD_WRONG: 2003;
    readonly USER_DISABLED: 2004;
    readonly COURSE_NOT_FOUND: 3001;
    readonly EXERCISE_NOT_FOUND: 3002;
    readonly KNOWLEDGE_POINT_NOT_FOUND: 3003;
    readonly LEARNING_PATH_NOT_FOUND: 3004;
    readonly SUBMISSION_NOT_FOUND: 3005;
    readonly EXEC_TIMEOUT: 4001;
    readonly MEMORY_LIMIT: 4002;
    readonly SANDBOX_ERROR: 4003;
    readonly AGENT_UNAVAILABLE: 5001;
    readonly LLM_TIMEOUT: 5002;
    readonly LLM_RATE_LIMIT: 5003;
    readonly AGENT_INVALID_RESPONSE: 5004;
    readonly INTERNAL_ERROR: 9001;
    readonly SERVICE_UNAVAILABLE: 9002;
    readonly BAD_REQUEST: 9003;
    readonly VALIDATION_ERROR: 9004;
};
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
export declare const ErrorMessages: Record<number, string>;
export declare function success<T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T>;
export declare function error(code: number, message?: string, errors?: FieldError[]): ApiError;
export declare function paginated<T>(items: T[], total: number, page: number, pageSize: number): ApiResponse<T[]>;
