import { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface InventoryTab {
  id: string;
  label: string;
  icon: string;
  description: string;
  content: ReactNode;
  disabled?: boolean;
}

interface InventoryTabsProps {
  tabs: InventoryTab[];
  defaultTab?: string;
}

export function InventoryTabs({ tabs, defaultTab }: InventoryTabsProps) {
  return (
    <Tabs defaultValue={defaultTab || tabs[0]?.id} className="space-y-6">
      {/* Tab Navigation */}
      <div className="fantasy-card p-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-transparent h-auto">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={tab.disabled}
              className={cn(
                "flex flex-col items-center gap-1.5 md:gap-2 p-2.5 md:p-4 rounded-lg",
                "data-[state=active]:bg-primary/10 data-[state=active]:border data-[state=active]:border-primary",
                "hover:bg-muted transition-all",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <span className="text-xl md:text-2xl">{tab.icon}</span>
              <span className="font-display text-xs md:text-sm">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Tab Content */}
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
