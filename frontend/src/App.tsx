import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { Dashboard } from './pages/Dashboard';
import { Lista as EmpresasLista } from './pages/Empresas/Lista';
import { Formulario as EmpresaFormulario } from './pages/Empresas/Formulario';
import { Formulario as ItemFormulario } from './pages/Itens/Formulario';
import { Lista as ProdutosLista } from './pages/Produtos/Lista';
import { Detalhes as ProdutoDetalhes } from './pages/Produtos/Detalhes';
import { Lista as NotasLista } from './pages/Notas/Lista';
import { Detalhe as NotaDetalhe } from './pages/Notas/Detalhe';
import { NFSe } from './pages/Emissao/NFSe';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './layouts/AppShell';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<SignupPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/app" element={<Dashboard />} />
          <Route path="/empresas" element={<EmpresasLista />} />
          <Route path="/empresas/nova" element={<EmpresaFormulario />} />
          <Route path="/empresas/:id/editar" element={<EmpresaFormulario />} />
          <Route path="/produtos" element={<ProdutosLista />} />
          <Route path="/produtos/novo" element={<ItemFormulario />} />
          <Route path="/produtos/:id" element={<ProdutoDetalhes />} />
          <Route path="/produtos/:id/editar" element={<ItemFormulario />} />
          <Route path="/itens/novo" element={<ItemFormulario />} />
          <Route path="/notas" element={<NotasLista />} />
          <Route path="/notas/nova/nfse" element={<NFSe />} />
          <Route path="/notas/:id" element={<NotaDetalhe />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
