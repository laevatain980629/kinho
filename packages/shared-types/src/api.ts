// 统一 API 响应
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 分页请求参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

// 工单列表查询参数
export interface WorkOrderListParams extends PaginationParams {
  state?: string;
  outletId?: number;
  priority?: string;
  startDate?: string;
  endDate?: string;
}

// 平台标识
export type Platform = 'PC' | 'INTERNAL_MOBILE' | 'CUSTOMER_H5';
