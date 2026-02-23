export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait = 300
) => {
  let timeout: ReturnType<typeof setTimeout>;

  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
};
