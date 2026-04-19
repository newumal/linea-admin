import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { authBootstrapRequest } from './store/authSaga.js';

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(authBootstrapRequest());
  }, [dispatch]);
  return <RouterProvider router={router} />;
}
