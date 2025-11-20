import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { User } from "@shared/schema";
import { Coins } from "lucide-react";

interface CoinFlipModalProps {
  open: boolean;
  player1: User;
  player2: User;
  player3?: User;
  player4?: User;
  isDoubles: boolean;
  onSelectServer: (serverId: string) => void;
}

export function CoinFlipModal({
  open,
  player1,
  player2,
  player3,
  player4,
  isDoubles,
  onSelectServer,
}: CoinFlipModalProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const team1Name = isDoubles && player3 
    ? `${player1.name} & ${player3.name}`
    : player1.name;
  
  const team2Name = isDoubles && player4
    ? `${player2.name} & ${player4.name}`
    : player2.name;

  const handleCoinFlip = () => {
    setIsFlipping(true);
    
    // Simulate coin flip animation
    setTimeout(() => {
      // Random selection between team 1 and team 2
      const team1Wins = Math.random() < 0.5;
      const winningPlayerId = team1Wins ? player1.id : player2.id;
      
      setWinner(winningPlayerId);
      setIsFlipping(false);
    }, 1500);
  };

  const handleConfirm = () => {
    if (winner) {
      onSelectServer(winner);
    }
  };

  const handleManualSelect = (playerId: string) => {
    setWinner(playerId);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Moneda al Aire</DialogTitle>
          <DialogDescription className="text-center">
            Determina qué {isDoubles ? "equipo" : "jugador"} sacará primero en el Set 1
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Coin Flip Button */}
          {!winner && (
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleCoinFlip}
                disabled={isFlipping}
                size="lg"
                className="h-32 w-32 rounded-full text-2xl"
                data-testid="button-flip-coin"
              >
                {isFlipping ? (
                  <div className="animate-spin">
                    <Coins className="h-16 w-16" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Coins className="h-16 w-16" />
                    <span className="text-sm">Lanzar</span>
                  </div>
                )}
              </Button>
              <p className="text-muted-foreground text-sm">
                {isFlipping ? "Lanzando..." : "Presiona para lanzar la moneda"}
              </p>
            </div>
          )}

          {/* Winner Display */}
          {winner && (
            <Card className="p-6 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-2 border-yellow-500">
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                  🎯 {winner === player1.id ? team1Name : team2Name}
                </p>
                <p className="text-lg text-yellow-700 dark:text-yellow-300">
                  sacará primero en el Set 1
                </p>
              </div>
            </Card>
          )}

          {/* Manual Selection */}
          <div className="space-y-3">
            <p className="text-sm text-center text-muted-foreground">
              O selecciona manualmente:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleManualSelect(player1.id)}
                variant={winner === player1.id ? "default" : "outline"}
                className="min-h-[60px] text-base"
                data-testid="button-select-team1"
              >
                {team1Name}
              </Button>
              <Button
                onClick={() => handleManualSelect(player2.id)}
                variant={winner === player2.id ? "default" : "outline"}
                className="min-h-[60px] text-base"
                data-testid="button-select-team2"
              >
                {team2Name}
              </Button>
            </div>
          </div>

          {/* Confirm Button */}
          {winner && (
            <Button
              onClick={handleConfirm}
              className="w-full min-h-[56px] text-lg font-semibold"
              data-testid="button-confirm-server"
            >
              Confirmar e Iniciar Partido
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
