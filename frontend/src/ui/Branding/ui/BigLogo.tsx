import styled from 'styled-components';

type BigLogoProps = {
  width?: number | string;
  height?: number | string;
  clickable?: boolean;
} & React.HTMLAttributes<HTMLImageElement>;

const Icon = styled.img<BigLogoProps>`
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
  width: ${({ width }) => (typeof width === 'number' ? `${width}px` : width)};
  user-select: none;
  height: ${({ height }) => (typeof height === 'number' ? `${height}px` : height)};
`;

const logo = import.meta.env.VITE_AZURE_BIG_LOGO_URL

const BigLogo = ({ width = 300, height = 44, clickable, ...rest }: BigLogoProps) => logo ? (
  <Icon {...rest} clickable={clickable} src={logo} alt='Logo' width={width} height={height} />
): null;

export { BigLogo };
