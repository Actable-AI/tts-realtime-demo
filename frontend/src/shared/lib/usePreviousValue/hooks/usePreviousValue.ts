import { useEffect, useRef } from 'react';

/**
 * Returns the previous value of the passed value.
 * @param value The value to get the previous value from.
 * @returns The previous value of the passed value.
 * @example
 * const [count, setCount] = useState(0);
 * const previousCount = usePreviousValue(count);
 * console.log(previousCount); // undefined
 * setCount(1);
 * console.log(previousCount); // 0
 */
const usePreviousValue = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};

export { usePreviousValue };
