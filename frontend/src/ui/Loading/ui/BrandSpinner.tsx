import styled, { keyframes } from 'styled-components';

const IconAnimation = keyframes`
  0% {
    transform: rotate(359deg);
  }
  100% {
    transform: rotate(0deg);
  }
`;

const Icon = styled.img<Props>`
  user-select: none;
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  animation: ${IconAnimation} 1s ease infinite;
`;

const Centred = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
`;

type Props = {
  size?: number;
  centered?: boolean;
};

const BrandSpinner = ({ size, centered = false }: Props) =>
  centered ? (
    <Centred>
      <Icon size={size} src='/icon.png' />
    </Centred>
  ) : (
    <Icon size={size} src='/icon.png' />
  );
BrandSpinner.defaultProps = {
  size: 30,
};
export { BrandSpinner };
