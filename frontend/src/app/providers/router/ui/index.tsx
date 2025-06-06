import { Suspense, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { getRoutesConfig } from '@app/configs/router';
import LoadingPage from '@pages/Loading';

const Router = () => {
  const routesConfig = useMemo(() => getRoutesConfig(), []);

  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
          {Object.values(routesConfig).map((route) => (
            <Route
              {...route}
              key={route.path}
              element={<Suspense fallback={<LoadingPage />}>{route.element}</Suspense>}
            />
          ))}
        </Routes>
    </Suspense>
  );
};

export { Router };
