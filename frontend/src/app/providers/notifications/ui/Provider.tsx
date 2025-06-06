import { notification as notificationAntD } from 'antd';
import { NotificationContext } from '../context';

type Props = {
  children: React.ReactNode;
};

const NotificationProvider = ({ children }: Props) => {
  const [api, context] = notificationAntD.useNotification();

  return (
    <NotificationContext.Provider value={api}>
      {context}
      {children}
    </NotificationContext.Provider>
  );
};

export { NotificationProvider };
