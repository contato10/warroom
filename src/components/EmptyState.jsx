export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: '#374151' }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>🚀</div>
      <div className="text-sm font-medium mb-1" style={{ color: '#6b7280' }}>War Room de Lançamentos Meteóricos</div>
      <div className="text-xs" style={{ color: '#374151' }}>Selecione um expert e um lançamento na sidebar para começar.</div>
      <div className="text-xs mt-1" style={{ color: '#374151' }}>Ou crie um novo expert clicando em "Novo Expert".</div>
    </div>
  );
}
