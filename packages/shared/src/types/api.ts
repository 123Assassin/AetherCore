export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<TItem> = {
  items: TItem[];
  meta: PaginationMeta;
};

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiSuccessResult<TData> = {
  success: true;
  data: TData;
};

export type ApiFailureResult<TError extends ApiError = ApiError> = {
  success: false;
  error: TError;
};

export type ApiResult<TData, TError extends ApiError = ApiError> =
  | ApiSuccessResult<TData>
  | ApiFailureResult<TError>;
