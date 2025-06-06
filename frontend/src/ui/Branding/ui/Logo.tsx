import styled from 'styled-components';

type Props = {
  size?: number;
};

const Icon = styled.img<Props>`
  user-select: none;
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
`;

const Logo = ({ size }: Props) => <Icon size={size} src='/icon.png' alt='Logo' />;

Logo.defaultProps = {
  size: 30,
};

export { Logo };
