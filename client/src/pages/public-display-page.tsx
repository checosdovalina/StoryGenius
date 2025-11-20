import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

interface PlayerInfo {
  id: string;
  name: string;
  photoUrl: string | null;
  nationality: string | null;
}

interface ActiveMatch {
  session: {
    id: string;
    matchId: string;
    player1Id: string;
    player2Id: string | null;
    player3Id: string | null;
    player4Id: string | null;
    status: string;
    matchType: string;
    currentSet: number;
    currentServer: string;
    player1Set1Score: number;
    player2Set1Score: number;
    player1Set2Score: number | null;
    player2Set2Score: number | null;
    player1Set3Score: number | null;
    player2Set3Score: number | null;
    player1TechnicalFouls: number;
    player2TechnicalFouls: number;
    player1Timeouts: number;
    player2Timeouts: number;
    player1Appellations: number;
    player2Appellations: number;
  };
  match: {
    id: string;
    tournamentId: string;
    round: string;
    courtId: string | null;
  };
  tournament: {
    id: string;
    name: string;
    matchRotationInterval: number;
  };
  player1: PlayerInfo;
  player2: PlayerInfo | null;
  player3: PlayerInfo | null;
  player4: PlayerInfo | null;
}

interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

function getFlagEmoji(countryCode: string | null): string {
  if (!countryCode) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function PlayerDisplay({ player, side }: { player: PlayerInfo; side: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-4 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <div className="flex-shrink-0">
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
            {player.name.charAt(0)}
          </div>
        )}
      </div>
      <div className={`${side === "right" ? "text-right" : "text-left"}`}>
        <h3 className="text-2xl font-bold text-white mb-1">{player.name}</h3>
        {player.nationality && (
          <div className="text-4xl">{getFlagEmoji(player.nationality)}</div>
        )}
      </div>
    </div>
  );
}

function ScoreBoard({ session }: { session: ActiveMatch["session"] }) {
  const isDoubles = session.matchType === "doubles";

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-xl p-8 shadow-2xl">
      <div className="flex justify-center items-center gap-12 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${session.currentServer === session.player1Id ? "bg-yellow-400 animate-pulse" : "bg-gray-600"}`} />
          <span className="text-white text-lg">Saque</span>
        </div>
        <div className="text-center">
          <div className="text-white text-sm mb-1">Set {session.currentSet}</div>
          <div className="text-white text-xs">
            {isDoubles ? "Dobles" : "Singles"} - {session.matchType.toUpperCase()}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white text-lg">Saque</span>
          <div className={`w-4 h-4 rounded-full ${session.currentServer === session.player2Id ? "bg-yellow-400 animate-pulse" : "bg-gray-600"}`} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 text-center">
        {/* Set 1 */}
        <div>
          <div className="text-white/70 text-sm mb-2">Set 1</div>
          <div className="flex justify-center gap-6">
            <div className={`text-5xl font-bold ${session.currentSet === 1 ? "text-yellow-400" : "text-white"}`}>
              {session.player1Set1Score}
            </div>
            <div className="text-5xl font-bold text-white/30">-</div>
            <div className={`text-5xl font-bold ${session.currentSet === 1 ? "text-yellow-400" : "text-white"}`}>
              {session.player2Set1Score}
            </div>
          </div>
        </div>

        {/* Set 2 */}
        <div>
          <div className="text-white/70 text-sm mb-2">Set 2</div>
          <div className="flex justify-center gap-6">
            <div className={`text-5xl font-bold ${session.currentSet === 2 ? "text-yellow-400" : session.player1Set2Score !== null ? "text-white" : "text-white/20"}`}>
              {session.player1Set2Score ?? "-"}
            </div>
            <div className="text-5xl font-bold text-white/30">-</div>
            <div className={`text-5xl font-bold ${session.currentSet === 2 ? "text-yellow-400" : session.player2Set2Score !== null ? "text-white" : "text-white/20"}`}>
              {session.player2Set2Score ?? "-"}
            </div>
          </div>
        </div>

        {/* Set 3 */}
        <div>
          <div className="text-white/70 text-sm mb-2">Set 3</div>
          <div className="flex justify-center gap-6">
            <div className={`text-5xl font-bold ${session.currentSet === 3 ? "text-yellow-400" : session.player1Set3Score !== null ? "text-white" : "text-white/20"}`}>
              {session.player1Set3Score ?? "-"}
            </div>
            <div className="text-5xl font-bold text-white/30">-</div>
            <div className={`text-5xl font-bold ${session.currentSet === 3 ? "text-yellow-400" : session.player2Set3Score !== null ? "text-white" : "text-white/20"}`}>
              {session.player2Set3Score ?? "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Additional stats */}
      <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div className="text-left text-white/80">
          <div>Faltas técnicas: {session.player1TechnicalFouls}</div>
          <div>Tiempos: {session.player1Timeouts}</div>
          <div>Apelaciones: {session.player1Appellations}</div>
        </div>
        <div className="text-right text-white/80">
          <div>Faltas técnicas: {session.player2TechnicalFouls}</div>
          <div>Tiempos: {session.player2Timeouts}</div>
          <div>Apelaciones: {session.player2Appellations}</div>
        </div>
      </div>
    </div>
  );
}

function SponsorBanner({ sponsors }: { sponsors: Sponsor[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (sponsors.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sponsors.length);
    }, 5000); // Change sponsor every 5 seconds

    return () => clearInterval(interval);
  }, [sponsors.length]);

  if (sponsors.length === 0) return null;

  const currentSponsor = sponsors[currentIndex];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-lg py-4">
      <div className="container mx-auto flex items-center justify-center gap-4">
        <span className="text-gray-600 text-sm">Patrocinado por:</span>
        {currentSponsor.logoUrl ? (
          <img
            src={currentSponsor.logoUrl}
            alt={currentSponsor.name}
            className="h-12 max-w-xs object-contain"
          />
        ) : (
          <span className="text-xl font-bold text-gray-800">{currentSponsor.name}</span>
        )}
      </div>
    </div>
  );
}

export default function PublicDisplayPage() {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [matches, setMatches] = useState<ActiveMatch[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Extract tournament ID from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("tournament");
    setTournamentId(tid);
  }, []);

  // Fetch active matches (polling fallback)
  const { data: polledMatches = [], isLoading: matchesLoading } = useQuery<ActiveMatch[]>({
    queryKey: tournamentId ? ["/api/tournaments", tournamentId, "active-matches"] : ["/api/active-matches"],
    refetchInterval: wsConnected ? false : 5000, // Only poll when WebSocket is disconnected
  });

  // Update matches from polling
  useEffect(() => {
    if (polledMatches.length > 0) {
      setMatches(polledMatches);
    }
  }, [polledMatches]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/public-display${tournamentId ? `?tournamentId=${tournamentId}` : ''}`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[Public Display] WebSocket connected');
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'connected') {
              console.log('[Public Display] Connection confirmed:', message.message);
            } else if (message.type === 'match_update') {
              // Update the specific match in the list
              setMatches((prevMatches) => {
                const updatedMatch = message.match;
                const matchId = updatedMatch.session.matchId;
                
                const index = prevMatches.findIndex((m) => m.session.matchId === matchId);
                
                if (index >= 0) {
                  // Update existing match
                  const newMatches = [...prevMatches];
                  newMatches[index] = updatedMatch;
                  return newMatches;
                } else {
                  // Add new match
                  return [...prevMatches, updatedMatch];
                }
              });
            }
          } catch (error) {
            console.error('[Public Display] Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[Public Display] WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('[Public Display] WebSocket disconnected, will reconnect...');
          setWsConnected(false);
          
          // Reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        };
      } catch (error) {
        console.error('[Public Display] Failed to create WebSocket:', error);
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [tournamentId]);

  // Fetch sponsors for current tournament
  const currentMatch = matches[currentMatchIndex];
  const { data: sponsors = [] } = useQuery<Sponsor[]>({
    queryKey: currentMatch ? ["/api/tournaments", currentMatch.tournament.id, "sponsors"] : [],
    enabled: !!currentMatch,
  });

  // Auto-rotate matches
  useEffect(() => {
    if (matches.length <= 1) return;

    const rotationInterval = currentMatch?.tournament?.matchRotationInterval || 40;
    const interval = setInterval(() => {
      setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    }, rotationInterval * 1000);

    return () => clearInterval(interval);
  }, [matches.length, currentMatch?.tournament?.matchRotationInterval]);

  if (matchesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20">
          <div className="text-white text-2xl text-center">
            No hay partidos activos en este momento
          </div>
        </Card>
      </div>
    );
  }

  const match = matches[currentMatchIndex];
  const isDoubles = match.session.matchType === "doubles";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Tournament header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">{match.tournament.name}</h1>
          <p className="text-xl text-white/80">{match.match.round}</p>
          {matches.length > 1 && (
            <div className="mt-4 text-white/60 text-sm">
              Partido {currentMatchIndex + 1} de {matches.length}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="space-y-8">
          {/* Players */}
          <div className="grid grid-cols-2 gap-12 mb-8">
            <div>
              <PlayerDisplay player={match.player1} side="left" />
              {isDoubles && match.player3 && (
                <div className="mt-4">
                  <PlayerDisplay player={match.player3} side="left" />
                </div>
              )}
            </div>
            <div>
              {match.player2 && <PlayerDisplay player={match.player2} side="right" />}
              {isDoubles && match.player4 && (
                <div className="mt-4">
                  <PlayerDisplay player={match.player4} side="right" />
                </div>
              )}
            </div>
          </div>

          {/* Scoreboard */}
          <ScoreBoard session={match.session} />
        </div>
      </div>

      {/* Sponsor banner */}
      <SponsorBanner sponsors={sponsors} />
    </div>
  );
}
