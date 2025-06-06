import { BrowserRouter } from 'react-router-dom';
import { i18n } from '@app/configs/i18n';
import { token } from '@app/configs/theme';
import { ConfigProvider } from 'antd';
import { I18nProvider } from './providers/i18n';
import { NotificationProvider } from './providers/notifications';
import { QueryProvider } from './providers/query';
import { Router } from './providers/router';
import { GlobalStyles } from './styles/globalStyles';

i18n.init();

const App = () => (
  <QueryProvider>
    <I18nProvider>
      <BrowserRouter>
        <ConfigProvider
          theme={{
            token,
          }}>
          <NotificationProvider>
            <GlobalStyles />
            <Router />
          </NotificationProvider>
        </ConfigProvider>
      </BrowserRouter>
    </I18nProvider>
  </QueryProvider>
);

export { App };
