import styled, { keyframes } from 'styled-components';

type PositiveIntegerType<T extends number> = `${T}` extends '0' | `-${any}` | `${any}.${any}` ? never : T;

const SkeletonAnimation = keyframes`
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
`;

type SkeletonItemProps<T extends number = number> = {
  height: PositiveIntegerType<T>;
};

const SkeletonItem = styled.div<SkeletonItemProps>`
  width: 100%;
  height: ${({ height }) => height}px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.247) 25%,
    rgba(255, 255, 255, 0.384) 37%,
    rgba(255, 255, 255, 0.26) 63%
  );
  background-size: auto;
  background-size: 400% 100%;
  animation-name: ${SkeletonAnimation};
  animation-duration: var(--timing-xl);
  animation-timing-function: ease;
  animation-iteration-count: infinite;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-m);
`;

const SkeletonContainer = styled.div`
  display: flex;
  flex-direction: column;

  width: 100%;
  padding: var(--spacing-xs) 0;
  gap: var(--spacing-xs);
`;

type Props<T extends number = number, P extends number = number> = {
  rows?: PositiveIntegerType<T>;
  rowHeight?: PositiveIntegerType<P>;
};

const Skeleton = <T extends number = number, P extends number = number>({
  rows = 1 as PositiveIntegerType<T>,
  rowHeight = 28 as PositiveIntegerType<P>,
}: Props<T, P>) => (
  <SkeletonContainer>
    {Array.from({ length: rows }).map((_, index) => (
      <SkeletonItem key={index} height={rowHeight} />
    ))}
  </SkeletonContainer>
);

export { Skeleton };
