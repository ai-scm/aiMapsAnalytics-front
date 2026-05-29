// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React from 'react';
import ReactDOM from 'react-dom/client';
import document from 'global/document';
import {Provider} from 'react-redux';
import {browserHistory, Router, Route} from 'react-router';
import {syncHistoryWithStore} from 'react-router-redux';
import store from './store';
import App from './app';
import {buildAppRoutes} from './utils/routes';
import KeycloakProvider from './components/styled-components/KeycloakProvider';

const history = syncHistoryWithStore(browserHistory, store);

const appRoute = buildAppRoutes(App);

const Root = () => (
  <Provider store={store}>
    <KeycloakProvider>
      <Router history={history}>
        <Route path="/" component={App}>
          {appRoute}
        </Route>
      </Router>
    </KeycloakProvider>
  </Provider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(<Root />);
