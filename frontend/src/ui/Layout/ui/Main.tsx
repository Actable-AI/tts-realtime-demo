import { mobileWindowSizeConfig } from '@app/configs/windowSize';
import { Layout } from 'antd';
import styled from 'styled-components';

const MainLayout = styled(Layout)`
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: center;
  align-content: flex-start;
  gap: var(--spacing-m);
  min-height: 100dvh;
  padding: var(--spacing-xl);

  @media (max-width: ${mobileWindowSizeConfig?.widthString}) {
    padding: var(--spacing-s);
    padding-top: var(--spacing-xl);
  }
`;

export { MainLayout };
