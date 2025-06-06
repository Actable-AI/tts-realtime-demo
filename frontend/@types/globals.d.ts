declare const IS_DEV: boolean;
declare module '*.md';

type RequiredProperty<T> = { [P in keyof T]: Required<NonNullable<T[P]>> };
