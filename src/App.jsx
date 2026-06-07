import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast from './components/Toast';
import Modal from './components/Modal';
import EmptyState from './components/EmptyState';
import TabDados from './pages/TabDados';
import TabGrupos from './pages/TabGrupos';
import TabCopies from './pages/TabCopies';
import TabExecutar from './pages/TabExecutar';
import TabHistorico from './pages/TabHistorico';

function Main() {
  const { selectedLancamentoId, activeTab, draft } = useApp();

  const renderTab = () => {
    if (!draft) return null;
    switch (activeTab) {
      case 'dados': return <TabDados />;
      case 'grupos': return <TabGrupos />;
      case 'copies': return <TabCopies />;
      case 'executar': return <TabExecutar />;
      case 'historico': return <TabHistorico />;
      default: return <TabDados />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedLancamentoId && draft ? (
          <>
            <Topbar />
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              {renderTab()}
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
      <Toast />
      <Modal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}
