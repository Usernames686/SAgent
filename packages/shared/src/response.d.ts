export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
    meta?: {
        requestId?: string;
        timestamp?: string;
        page?: number;
        pageSize?: number;
        total?: number;
    };
}
export declare function success<T>(data: T, meta?: ApiResponse['meta']): ApiResponse<T>;
export declare function error(code: number, message?: string, errors?: {
    field: string;
    message: string;
}[]): ApiResponse<null>;
export declare function paginated<T>(items: T[], total: number, page: number, pageSize: number): ApiResponse<T[]>;
