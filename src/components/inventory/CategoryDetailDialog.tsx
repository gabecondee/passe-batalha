import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CategoryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: string;
  children: ReactNode;
}

export function CategoryDetailDialog({ open, onOpenChange, title, icon, children }: CategoryDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-primary/30 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-display text-xl uppercase tracking-wider">
            <span className="text-3xl">{icon}</span>
            <span className="text-gradient-cyan">{title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
