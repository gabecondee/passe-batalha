import { useMemo, useRef, useState } from 'react';
import { Database, Download, Upload, RefreshCw, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { toast } from 'sonner';

function dumpLocalStorage() {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) out[k] = localStorage.getItem(k) || '';
  }
  return out;
}

function bytesUsed() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) total += (k.length + (localStorage.getItem(k) || '').length) * 2;
  }
  return total;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function DataSettings() {
  const restoreRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const size = useMemo(() => bytesUsed(), []);

  const download = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = () => { download(dumpLocalStorage(), `passe-batalha-export-${Date.now()}.json`); toast.success('Dados exportados'); };
  const backup = () => { download({ createdAt: new Date().toISOString(), data: dumpLocalStorage() }, `backup-${Date.now()}.json`); toast.success('Backup criado'); };

  const restore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = parsed.data || parsed;
        Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, String(v)));
        toast.success('Backup restaurado');
        setTimeout(() => window.location.reload(), 800);
      } catch { toast.error('Arquivo inválido'); }
    };
    reader.readAsText(file);
  };

  const clearCache = () => {
    ['agenda_events_v1', 'google_calendar_session_v1'].forEach(k => localStorage.removeItem(k));
    toast.success('Cache limpo');
  };

  const deleteAll = () => {
    localStorage.clear();
    toast.success('Todos os dados locais foram removidos');
    setTimeout(() => window.location.reload(), 800);
  };

  const actions = [
    { icon: Download, label: 'Exportar dados', desc: 'Baixe todos os seus dados em JSON', onClick: exportData },
    { icon: HardDrive, label: 'Backup manual', desc: 'Gere um arquivo de backup completo', onClick: backup },
    { icon: Upload, label: 'Restaurar backup', desc: 'Importe um arquivo de backup', onClick: () => restoreRef.current?.click() },
    { icon: RefreshCw, label: 'Excluir cache', desc: 'Remove cache de sincronização', onClick: clearCache },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <SettingsHeader icon={Database} title="Dados" backTo="/settings" />

        <div className="fantasy-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-display">Armazenamento local</p>
            <p className="font-display text-2xl text-primary">{formatBytes(size)}</p>
          </div>
          <HardDrive className="w-10 h-10 text-primary/40" />
        </div>

        <div className="space-y-3">
          {actions.map(a => (
            <button key={a.label} onClick={a.onClick} className="fantasy-card w-full p-4 flex items-center gap-4 text-left hover:shadow-[0_0_15px_hsl(var(--primary)/0.25)] transition-shadow">
              <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center shrink-0">
                <a.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-display uppercase tracking-wider text-sm">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </button>
          ))}
          <input ref={restoreRef} type="file" accept="application/json" onChange={restore} className="hidden" />

          <button onClick={() => setConfirmDelete(v => !v)} className="fantasy-card w-full p-4 flex items-center gap-4 text-left hover:shadow-[0_0_15px_hsl(var(--destructive)/0.35)] transition-shadow">
            <div className="w-11 h-11 rounded-lg bg-destructive/10 border border-destructive/50 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-display uppercase tracking-wider text-sm text-destructive">Excluir todos os dados locais</p>
              <p className="text-xs text-muted-foreground">Ação irreversível</p>
            </div>
          </button>

          {confirmDelete && (
            <div className="fantasy-card p-4 border border-destructive/50 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <p className="font-display text-sm">Tem certeza? Isso remove tudo!</p>
              </div>
              <div className="flex gap-2">
                <button onClick={deleteAll} className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground font-display text-xs tracking-wider">CONFIRMAR</button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 px-3 py-2 rounded-lg border border-border font-display text-xs tracking-wider">CANCELAR</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
