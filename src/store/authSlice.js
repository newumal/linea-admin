import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  bootstrapDone: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authBootstrapComplete(state, action) {
      state.user = action.payload;
      state.bootstrapDone = true;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    clearAuth(state) {
      state.user = null;
    },
  },
});

export const { authBootstrapComplete, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
