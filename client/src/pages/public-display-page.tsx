import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

interface PlayerInfo {
  id: string;
  name: string;
  photoUrl: string | null;
  nationality: string | null;
}

interface MatchStats {
  aces: number;
  recto: number;
  esquina: number;
  cruzado: number;
  punto: number;
  totalPoints: number;
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
    serverId: string | null;
    player1CurrentScore: string;
    player2CurrentScore: string;
    player1Sets: number;
    player2Sets: number;
    player1Technicals: number;
    player2Technicals: number;
    player1TimeoutsUsed: string;
    player2TimeoutsUsed: string;
    player1AppellationsUsed: string;
    player2AppellationsUsed: string;
    matchWinner: string | null;
    completedAt: string | null;
  };
  stats?: {
    team1: MatchStats;
    team2: MatchStats;
  };
  matchWinner?: PlayerInfo | null;
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
    <div className={`flex items-center gap-3 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <div className="flex-shrink-0">
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-lg">
            {player.name.charAt(0)}
          </div>
        )}
      </div>
      <div className={`${side === "right" ? "text-right" : "text-left"}`}>
        <h3 className="text-base font-bold text-white mb-0.5">{player.name}</h3>
        {player.nationality && (
          <div className="text-2xl">{getFlagEmoji(player.nationality)}</div>
        )}
      </div>
    </div>
  );
}

function ScoreBoard({ session, stats }: { session: ActiveMatch["session"], stats?: { team1: MatchStats; team2: MatchStats } }) {
  const isDoubles = session.matchType === "doubles";
  
  const player1Timeouts = session.player1TimeoutsUsed ? JSON.parse(session.player1TimeoutsUsed).length : 0;
  const player2Timeouts = session.player2TimeoutsUsed ? JSON.parse(session.player2TimeoutsUsed).length : 0;
  const player1Appellations = session.player1AppellationsUsed ? JSON.parse(session.player1AppellationsUsed).length : 0;
  const player2Appellations = session.player2AppellationsUsed ? JSON.parse(session.player2AppellationsUsed).length : 0;
  
  // Check if player1 or player3 is serving (team 1)
  const isTeam1Serving = session.serverId === session.player1Id || session.serverId === session.player3Id;
  // Check if player2 or player4 is serving (team 2)
  const isTeam2Serving = session.serverId === session.player2Id || session.serverId === session.player4Id;

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 shadow-2xl">
      <div className="flex justify-center items-center gap-8 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isTeam1Serving ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50" : "bg-gray-600"}`} />
          <span className="text-white text-sm">Saque</span>
        </div>
        <div className="text-center">
          <div className="text-white text-xs mb-0.5">Set {session.currentSet}</div>
          <div className="text-white/70 text-xs">
            {isDoubles ? "Dobles" : "Singles"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">Saque</span>
          <div className={`w-3 h-3 rounded-full ${isTeam2Serving ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50" : "bg-gray-600"}`} />
        </div>
      </div>

      {/* Current Score */}
      <div className="flex justify-center items-center gap-8 mb-4">
        <div className="text-6xl font-bold text-yellow-400">
          {session.player1CurrentScore}
        </div>
        <div className="text-4xl font-bold text-white/30">-</div>
        <div className="text-6xl font-bold text-yellow-400">
          {session.player2CurrentScore}
        </div>
      </div>

      {/* Sets Won */}
      <div className="flex justify-center items-center gap-4 mb-3">
        <div className="text-center">
          <div className="text-white/70 text-xs mb-1">Sets Ganados</div>
          <div className="flex gap-3 items-center">
            <div className="text-2xl font-bold text-white">
              {session.player1Sets}
            </div>
            <div className="text-xl font-bold text-white/30">-</div>
            <div className="text-2xl font-bold text-white">
              {session.player2Sets}
            </div>
          </div>
        </div>
      </div>

      {/* Shot Statistics */}
      {stats && (
        <div className="mt-3 border-t border-white/20 pt-3">
          <div className="text-white/70 text-xs text-center mb-2">Estadísticas de Tiro</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Team 1 Stats */}
            <div className="text-left space-y-0.5">
              <div className="text-white/90 flex justify-between">
                <span>🎯 Aces:</span>
                <span className="font-bold text-green-400">{stats.team1.aces}</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span>➡️ Recto:</span>
                <span className="font-bold">{stats.team1.recto}</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span>📐 Esquina:</span>
                <span className="font-bold">{stats.team1.esquina}</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span>↗️ Cruzado:</span>
                <span className="font-bold">{stats.team1.cruzado}</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span>⚡ Punto:</span>
                <span className="font-bold">{stats.team1.punto}</span>
              </div>
              <div className="text-white/90 flex justify-between border-t border-white/20 pt-1 mt-1">
                <span>Total:</span>
                <span className="font-bold text-yellow-400">{stats.team1.totalPoints}</span>
              </div>
            </div>

            {/* Team 2 Stats */}
            <div className="text-right space-y-0.5">
              <div className="text-white/90 flex justify-between">
                <span className="font-bold text-green-400">{stats.team2.aces}</span>
                <span>🎯 Aces:</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span className="font-bold">{stats.team2.recto}</span>
                <span>➡️ Recto:</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span className="font-bold">{stats.team2.esquina}</span>
                <span>📐 Esquina:</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span className="font-bold">{stats.team2.cruzado}</span>
                <span>↗️ Cruzado:</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span className="font-bold">{stats.team2.punto}</span>
                <span>⚡ Punto:</span>
              </div>
              <div className="text-white/90 flex justify-between border-t border-white/20 pt-1 mt-1">
                <span className="font-bold text-yellow-400">{stats.team2.totalPoints}</span>
                <span>Total:</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional stats */}
      <div className="mt-3 grid grid-cols-2 gap-4 text-xs border-t border-white/20 pt-2">
        <div className="text-left text-white/80 space-y-0.5">
          <div>Faltas: {session.player1Technicals}</div>
          <div>Tiempos: {player1Timeouts}</div>
          <div>Apelaciones: {player1Appellations}</div>
        </div>
        <div className="text-right text-white/80 space-y-0.5">
          <div>Faltas: {session.player2Technicals}</div>
          <div>Tiempos: {player2Timeouts}</div>
          <div>Apelaciones: {player2Appellations}</div>
        </div>
      </div>
    </div>
  );
}

function MatchEndedDisplay({ match, winner }: { match: ActiveMatch; winner: PlayerInfo | null }) {
  const isDoubles = match.session.matchType === "doubles";
  const team1Won = match.session.matchWinner === match.session.player1Id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 py-4 px-4 pb-20 flex flex-col items-center justify-center">
      <div className="container mx-auto max-w-4xl">
        {/* PARTIDO TERMINADO */}
        <div className="text-center mb-8 animate-pulse">
          <h1 className="text-5xl font-bold text-green-400 mb-2">🏆 PARTIDO TERMINADO 🏆</h1>
          <p className="text-2xl text-white">{match.tournament.name}</p>
          <p className="text-lg text-white/80">{match.match.round}</p>
        </div>

        {/* GANADOR */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-8 mb-8 shadow-2xl border-4 border-yellow-400">
          <div className="text-center">
            <p className="text-white text-2xl font-bold mb-4">EQUIPO GANADOR</p>
            <div className="flex items-center gap-6 justify-center mb-4">
              {winner?.photoUrl ? (
                <img
                  src={winner.photoUrl}
                  alt={winner.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-3xl font-bold text-orange-500">
                  {winner?.name.charAt(0)}
                </div>
              )}
              <div className="text-left">
                <h2 className="text-4xl font-bold text-white">{winner?.name}</h2>
                {winner?.nationality && (
                  <div className="text-5xl mt-2">{getFlagEmoji(winner.nationality)}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PUNTUACIÓN FINAL */}
        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-6 shadow-2xl mb-8">
          <h3 className="text-white text-2xl font-bold text-center mb-6">RESULTADO FINAL</h3>
          
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Equipo 1 */}
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Equipo 1</p>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex justify-center gap-4 items-center mb-3">
                  <div className="text-5xl font-bold text-yellow-400">{match.session.player1Sets}</div>
                  <div className="text-3xl text-white/50">-</div>
                  <div className="text-5xl font-bold text-yellow-400">{match.session.player2Sets}</div>
                </div>
                <p className="text-white text-sm">Sets</p>
              </div>
            </div>

            {/* Equipo 2 */}
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Puntuación del Set Final</p>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex justify-center gap-4 items-center mb-3">
                  <div className="text-5xl font-bold text-yellow-400">{match.session.player1CurrentScore}</div>
                  <div className="text-3xl text-white/50">-</div>
                  <div className="text-5xl font-bold text-yellow-400">{match.session.player2CurrentScore}</div>
                </div>
                <p className="text-white text-sm">Puntos</p>
              </div>
            </div>
          </div>

          {/* Players info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="text-left space-y-2">
              <p className="text-white/70 text-xs">Equipo 1</p>
              <p className="text-white font-bold">{match.player1.name}</p>
              {isDoubles && match.player3 && (
                <p className="text-white font-bold">{match.player3.name}</p>
              )}
            </div>
            <div className="text-right space-y-2">
              <p className="text-white/70 text-xs">Equipo 2</p>
              {match.player2 && <p className="text-white font-bold">{match.player2.name}</p>}
              {isDoubles && match.player4 && (
                <p className="text-white font-bold">{match.player4.name}</p>
              )}
            </div>
          </div>
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
  const isMatchEnded = match.session.status === 'completed' || match.session.matchWinner !== null;

  if (isMatchEnded) {
    return (
      <>
        <MatchEndedDisplay match={match} winner={match.matchWinner || null} />
        <SponsorBanner sponsors={sponsors} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 py-4 px-4 pb-20">
      <div className="container mx-auto max-w-6xl">
        {/* Tournament header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-white mb-1">{match.tournament.name}</h1>
          <p className="text-base text-white/80">{match.match.round}</p>
          {matches.length > 1 && (
            <div className="mt-2 text-white/60 text-xs">
              Partido {currentMatchIndex + 1} de {matches.length}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="space-y-4">
          {/* Players */}
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div>
              <PlayerDisplay player={match.player1} side="left" />
              {isDoubles && match.player3 && (
                <div className="mt-2">
                  <PlayerDisplay player={match.player3} side="left" />
                </div>
              )}
            </div>
            <div>
              {match.player2 && <PlayerDisplay player={match.player2} side="right" />}
              {isDoubles && match.player4 && (
                <div className="mt-2">
                  <PlayerDisplay player={match.player4} side="right" />
                </div>
              )}
            </div>
          </div>

          {/* Scoreboard */}
          <ScoreBoard session={match.session} stats={match.stats} />
        </div>
      </div>

      {/* Sponsor banner */}
      <SponsorBanner sponsors={sponsors} />
    </div>
  );
}
