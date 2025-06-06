import styled from 'styled-components';

type Props = {
  color?: string;
} & React.HTMLAttributes<HTMLImageElement>;

const Icon = styled.svg<Props>`
  path {
    fill: ${({ color }) => color || 'var(--primary-color)'};
  }
`;

const MagicIcon = (props: Props) => (
  <Icon width='56' height='51' viewBox='0 0 56 51' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
    <path d='M22.4 44.6984L15.4 29.3333L0 22.3492L15.4 15.3651L22.4 0L29.4 15.3651L44.8 22.3492L29.4 29.3333L22.4 44.6984ZM44.8 50.2857L41.3 42.6032L33.6 39.1111L41.3 35.619L44.8 27.9365L48.3 35.619L56 39.1111L48.3 42.6032L44.8 50.2857Z' />
  </Icon>
);

export { MagicIcon };
