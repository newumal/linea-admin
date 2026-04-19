import { takeLatest, put, call } from 'redux-saga/effects';
import { createAction } from '@reduxjs/toolkit';
import { apiFetch, clearStoredTokens, getStoredTokens } from '../api/client.js';
import { AUTH } from '../api/endpoints.js';
import { authBootstrapComplete } from './authSlice.js';

export const authBootstrapRequest = createAction('auth/bootstrapRequest');

function* runBootstrap() {
  const { accessToken } = getStoredTokens();
  if (!accessToken) {
    yield put(authBootstrapComplete(null));
    return;
  }
  try {
    const data = yield call(apiFetch, AUTH.me, { auth: true });
    yield put(authBootstrapComplete(data.user));
  } catch {
    clearStoredTokens();
    yield put(authBootstrapComplete(null));
  }
}

export default function* authSaga() {
  yield takeLatest(authBootstrapRequest.type, runBootstrap);
}
