import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Crosschain } from './pages/Crosschain';
import { FX } from './pages/FX';
import { Chains } from './pages/Chains';
import { ChainDetail } from './pages/ChainDetail';
import { Wallet } from './pages/Wallet';
import { Transfers } from './pages/Transfers';
import { TransferDetail } from './pages/TransferDetail';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/crosschain" element={<Crosschain />} />
        <Route path="/fx" element={<FX />} />
        <Route path="/chains" element={<Chains />} />
        <Route path="/chains/:chainId" element={<ChainDetail />} />
        <Route path="/wallet/:address" element={<Wallet />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/transfers/:id" element={<TransferDetail />} />
        {/* Legacy route redirect */}
        <Route path="/routes" element={<Crosschain />} />
      </Routes>
    </Layout>
  );
}
