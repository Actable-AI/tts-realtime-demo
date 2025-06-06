import { queryClient } from '@shared/api';

const refetchUserData = () => {
  queryClient.resetQueries();
};

export { refetchUserData };
