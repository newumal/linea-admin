import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage.jsx';
import { AdminLayout } from './layout/AdminLayout.jsx';
import { ProtectedLayout } from './layout/ProtectedLayout.jsx';
import { RoleGate } from './layout/RoleGate.jsx';
import Dashboard from './pages/Dashboard.jsx';
import OrdersList from './pages/orders/List.jsx';
import OrderDetail from './pages/orders/Detail.jsx';
import PreordersKanban from './pages/preorders/Kanban.jsx';
import ProductsList from './pages/products/List.jsx';
import ProductEdit from './pages/products/Edit.jsx';
import LowStock from './pages/inventory/LowStock.jsx';
import CategoriesPage from './pages/categories/Index.jsx';
import BrandsPage from './pages/brands/Index.jsx';
import CatalogOptionsPage from './pages/catalog/Options.jsx';
import RestockRequestsPage from './pages/restock/Requests.jsx';
import CustomersList from './pages/customers/List.jsx';
import CustomerDetail from './pages/customers/Detail.jsx';
import PromosList from './pages/promos/List.jsx';
import PromoEdit from './pages/promos/Edit.jsx';
import PromoRedemptions from './pages/promos/Redemptions.jsx';
import ReviewsQueue from './pages/reviews/Queue.jsx';
import CmsSlotEditor from './pages/cms/SlotEditor.jsx';
import AnalyticsIndex from './pages/analytics/index.jsx';
import AuditLog from './pages/audit/Log.jsx';
import SettingsUsers from './pages/settings/Users.jsx';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            element: <RoleGate />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: 'dashboard', element: <Dashboard /> },
              { path: 'orders', element: <OrdersList /> },
              { path: 'orders/:id', element: <OrderDetail /> },
              { path: 'preorders', element: <PreordersKanban /> },
              { path: 'products', element: <ProductsList /> },
              { path: 'products/:id', element: <ProductEdit /> },
              { path: 'inventory', element: <LowStock /> },
              { path: 'restock-requests', element: <RestockRequestsPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'brands', element: <BrandsPage /> },
              { path: 'catalog/options', element: <CatalogOptionsPage /> },
              { path: 'promos', element: <PromosList /> },
              { path: 'promos/redemptions', element: <PromoRedemptions /> },
              { path: 'promos/:id', element: <PromoEdit /> },
              { path: 'reviews', element: <ReviewsQueue /> },
              { path: 'customers', element: <CustomersList /> },
              { path: 'customers/:id', element: <CustomerDetail /> },
              { path: 'cms', element: <CmsSlotEditor /> },
              { path: 'analytics', element: <AnalyticsIndex /> },
              { path: 'audit', element: <AuditLog /> },
              { path: 'settings/users', element: <SettingsUsers /> },
            ],
          },
        ],
      },
    ],
  },
]);
