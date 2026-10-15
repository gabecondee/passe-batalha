import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MissionOperation } from '@/services/missionPersistence';

interface Props {
  state: { saving: boolean; operation: MissionOperation | null; error: string | null; retry: () => void; dismiss: () => void };
}
export function MissionSaveDialog({ state }: Props) {
  return <Dialog open={state.saving || state.error !== null} onOpenChange={open => { if (!open && !state.saving) state.dismiss(); }}>
    <DialogContent className={state.saving ? '[&>button]:hidden' : ''}
      onEscapeKeyDown={event => { if (state.saving) event.preventDefault(); }}
      onPointerDownOutside={event => event.preventDefault()}>
      <DialogHeader>
        <DialogTitle>{state.saving ? 'Salvando missão' : 'Não conseguimos confirmar a ação'}</DialogTitle>
        <DialogDescription>{state.saving
          ? 'Aguarde a confirmação do seu registro.'
          : 'Verifique sua conexão. Ao tentar novamente, vamos conferir se o registro já foi salvo.'}</DialogDescription>
      </DialogHeader>
      {state.saving ? <div role="status" className="flex items-center justify-center gap-3 py-6">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> Confirmando…
      </div> : <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={state.dismiss}>Fechar</Button>
        <Button onClick={state.retry}>Tentar novamente</Button>
      </div>}
    </DialogContent>
  </Dialog>;
}
