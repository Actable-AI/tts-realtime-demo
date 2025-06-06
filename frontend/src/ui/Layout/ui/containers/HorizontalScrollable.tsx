import styled from 'styled-components';

type Props = {
  children: React.ReactNode;
};

const Container = styled.div`
  max-width: 100%;
  min-width: 100%;
  overflow-x: auto;
`;

const HorizontalScrollableContainer = ({ children }: Props) => <Container>{children}</Container>;

export { HorizontalScrollableContainer };
