import { RouteProps } from 'react-router-dom';
import NotFound from '@pages/NotFound';
import Home from '@pages/Root';
import { RouteEnum } from './enums/route';

const routesPaths: Record<RouteEnum, string> = {
  [RouteEnum.root]: '/',
  [RouteEnum.notFound]: '*',
};

const routesForRedirect = {
  root: '/',
};

type RouterConfigType = Record<RouteEnum, RouteProps>;

const getRoutesConfig = (): RouterConfigType => ({
  [RouteEnum.root]: {
    path: routesPaths[RouteEnum.root],
    element: <Home />,
  },
  [RouteEnum.notFound]: {
    path: routesPaths[RouteEnum.notFound],
    element: <NotFound />,
  },
});

export { getRoutesConfig, routesForRedirect, routesPaths };
