import { createContext } from 'react';
import { NotificationInstance } from 'antd/es/notification/interface';

const NotificationContext = createContext<NotificationInstance | null>(null);

export { NotificationContext };
