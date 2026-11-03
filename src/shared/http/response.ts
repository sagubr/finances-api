export type ApiSuccess<T> = Readonly<{
  success: true;
  data: T;
  message?: string;
}>;

export const response = <T>(data: T, message?: string): ApiSuccess<T> => ({
  success: true,
  data,
  ...(message ? { message } : {}),
});
