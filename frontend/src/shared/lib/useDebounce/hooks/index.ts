import { useEffect, useRef } from 'react';

/**
 * Custom hook to debounce a callback function.
 * @param callback The function to debounce.
 * @param delay The delay in milliseconds.
 * @returns A debounced version of the callback function.
 */
const useDebounce = <T extends (...args: any[]) => void>(callback: T, delay: number): T => {
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  function debounceFunction(...args: Parameters<T>) {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => callback(...args), delay);
  }

  return debounceFunction as T;
};

export { useDebounce };
