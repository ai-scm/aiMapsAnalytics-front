// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import {combineReducers, createStore, applyMiddleware, compose} from 'redux';
import {routerReducer, routerMiddleware} from 'react-router-redux';
import {browserHistory} from 'react-router';
import {createLogger} from 'redux-logger';
import thunk from 'redux-thunk';

import {enhanceReduxMiddleware} from '@kepler.gl/reducers';

// eslint-disable-next-line no-unused-vars
import Window from 'global/window';

import demoReducer from './reducers/index';
import {apiSlice} from './components/styled-components/apiSlice';
import mapLoadReducer from './components/styled-components/mapLoadSlice';

const reducers = combineReducers({
  demo: demoReducer,
  routing: routerReducer,
  mapLoad: mapLoadReducer,
  [apiSlice.reducerPath]: apiSlice.reducer
});

export const middlewares = enhanceReduxMiddleware([
  thunk,
  routerMiddleware(browserHistory),
  apiSlice.middleware
]);

if (NODE_ENV === 'local') {
  // Redux logger
  const logger = createLogger({
    collapsed: () => true // Collapse all actions for more compact log
  });
  middlewares.push(logger);
}

export const enhancers = [applyMiddleware(...middlewares)];

const initialState = {};

// eslint-disable-next-line prefer-const
let composeEnhancers = compose;

/**
 * comment out code below to enable Redux Devtools
 */

if (Window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
  composeEnhancers = Window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
    actionsBlacklist: [
      '@@kepler.gl/MOUSE_MOVE',
      '@@kepler.gl/UPDATE_MAP',
      '@@kepler.gl/LAYER_HOVER'
    ]
  });
}

export default createStore(reducers, initialState, composeEnhancers(...enhancers));
