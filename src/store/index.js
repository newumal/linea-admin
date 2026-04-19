import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import authReducer from './authSlice.js';
import rootSaga from './rootSaga.js';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (gDM) => gDM({ serializableCheck: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);
