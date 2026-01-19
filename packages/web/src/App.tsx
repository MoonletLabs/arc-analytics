import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { FX } from './pages/FX';
import { ChainDetail } from './pages/ChainDetail';
import { Wallet } from './pages/Wallet';
import { TransferDetail } from './pages/TransferDetail';
import {
  BridgeLayout,
  BridgeOverview,
  BridgeTransfers,
  BridgeChains,
  BridgeRoutes,
} from './pages/bridge';

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Bridge section with sub-navigation */}
        <Route path="/bridge" element={<BridgeLayout><BridgeOverview /></BridgeLayout>} />
        <Route path="/bridge/transfers" element={<BridgeLayout><BridgeTransfers /></BridgeLayout>} />
        <Route path="/bridge/chains" element={<BridgeLayout><BridgeChains /></BridgeLayout>} />
        <Route path="/bridge/chains/:chainId" element={<BridgeLayout><ChainDetail /></BridgeLayout>} />
        <Route path="/bridge/routes" element={<BridgeLayout><BridgeRoutes /></BridgeLayout>} />
        
        {/* FX */}
        <Route path="/fx" element={<FX />} />
        
        {/* Wallet detail */}
        <Route path="/wallet/:address" element={<Wallet />} />
        
        {/* Transfer detail */}
        <Route path="/transfers/:id" element={<TransferDetail />} />
        
        {/* Legacy redirects */}
        <Route path="/analytics" element={<Navigate to="/bridge" replace />} />
        <Route path="/crosschain" element={<Navigate to="/bridge" replace />} />
        <Route path="/routes" element={<Navigate to="/bridge/routes" replace />} />
        <Route path="/transfers" element={<Navigate to="/bridge/transfers" replace />} />
        <Route path="/chains" element={<Navigate to="/bridge/chains" replace />} />
        <Route path="/chains/:chainId" element={<Navigate to="/bridge/chains/:chainId" replace />} />
      </Routes>
    </Layout>
  );
}
