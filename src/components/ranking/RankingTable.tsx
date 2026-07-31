import { RankingUser } from '@/types/game';
import { cn } from '@/lib/utils';
import { Trophy, Medal, Award } from 'lucide-react';

interface RankingTableProps {
  users: RankingUser[];
  currentUserId: string;
}

export function RankingTable({ users, currentUserId }: RankingTableProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-mono">{rank}</span>;
    }
  };

  return (
    <div className="fantasy-card overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-xl">Ranking Global</h2>
        <p className="text-sm text-muted-foreground">Os guerreiros mais poderosos</p>
      </div>

      <div className="divide-y divide-border">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          
          return (
            <div 
              key={user.id}
              className={cn(
                "flex items-center gap-2 md:gap-4 p-3 md:p-4 transition-colors",
                isCurrentUser ? "bg-primary/10" : "hover:bg-muted/50",
                user.rank <= 3 && "bg-gradient-to-r from-primary/5 to-transparent"
              )}
            >
              {/* Rank */}
              <div className="w-10 flex justify-center">
                {getRankIcon(user.rank)}
              </div>

              {/* Avatar */}
              <div className="relative hidden sm:block">
                <div className={cn(
                  "w-12 h-12 rounded-full overflow-hidden border-2",
                  user.rank === 1 && "border-yellow-400",
                  user.rank === 2 && "border-gray-400",
                  user.rank === 3 && "border-amber-600",
                  user.rank > 3 && "border-border"
                )}>
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {user.level}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium truncate",
                    isCurrentUser && "text-primary"
                  )}>
                    {user.name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                      Você
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  Nível {user.level}
                </span>
              </div>

              {/* XP */}
              <div className="text-right">
                <span className="xp-badge">
                  {user.totalXP.toLocaleString()} XP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
