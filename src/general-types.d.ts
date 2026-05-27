type ItemRef = number | string | { id?: number | string };

type ApiListResponse<T> = {
  docs?: T[];
};
