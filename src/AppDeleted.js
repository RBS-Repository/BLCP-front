import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import CategoryManager from './pages/admin/CategoryManager';
import { RequireAuth, RequireAdmin } from './components/auth/ProtectedRoutes';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route 
          path="/admin/categories" 
          element={
            <RequireAuth>
              <RequireAdmin>
                <CategoryManager />
              </RequireAdmin>
            </RequireAuth>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App; 