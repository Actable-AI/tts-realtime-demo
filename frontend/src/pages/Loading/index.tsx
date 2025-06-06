import styled from 'styled-components';
import { Spin } from 'antd';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100dvh;
  width: 100%;
`;

const LoadingPage = () => (
  <Container>
    <Spin size={'large'} />
  </Container>
);

export default LoadingPage;
