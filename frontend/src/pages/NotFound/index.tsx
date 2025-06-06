import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { routesForRedirect } from '@app/configs/router/routes';
import { Button } from 'antd';
import styled from 'styled-components';

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  min-height: 100dvh;
`;

const Title = styled.h1`
  color: var(--primary-color);
  font: var(--font-xxxl);
  margin-bottom: var(--spacing-s);
`;

const Description = styled.h2`
  color: var(--secondary-color);
  font: var(--font-xl);
  margin-bottom: var(--spacing-s);
`;

const NotFound = () => {
  const { t } = useTranslation('page');
  const navigate = useNavigate();

  const handleGoToHome = () => navigate(routesForRedirect.rtt);

  return (
    <Container>
      <Title>404</Title>
      <Description>{t('notFound.title')}</Description>
      <Button onClick={handleGoToHome} type='primary'>
        {t('notFound.button')}
      </Button>
    </Container>
  );
};

export default NotFound;
