import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PortalLayout from './components/layout/PortalLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreateOrderPage from './pages/CreateOrderPage';
import OrdersPage from './pages/OrdersPage';
import PlaceholderPage from './pages/PlaceholderPage';
import NotFoundPage from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Portal Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PortalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders/new" element={<CreateOrderPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route
          path="reports"
          element={
            <PlaceholderPage
              title="Trip Reports"
              featureId="feature/b2b-reports (P0)"
              description="Detailed post-trip closure reports with route summary, timestamps, driver info, and itemized expenses."
            />
          }
        />
        <Route
          path="statements"
          element={
            <PlaceholderPage
              title="Month-End Statements"
              featureId="feature/b2b-statements (P0)"
              description="View and verify published month-end statements once approved by two platform administrators."
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
