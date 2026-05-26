export class PaginatedResponse<T> {
  list!: T[];
  total!: number;
  page!: number;
  pageSize!: number;
}
