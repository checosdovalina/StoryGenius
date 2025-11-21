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
    <div className={`flex items-center gap-4 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <div className="flex-shrink-0">
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
            {player.name.charAt(0)}
          </div>
        )}
      </div>
      <div className={`${side === "right" ? "text-right" : "text-left"}`}>
        <h3 className="text-2xl font-bold text-white">{player.name}</h3>
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
                <span>Aces:</span>
                <span className="font-bold text-green-400">{stats.team1.aces}</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span>Recto:</span>
                <span className="font-bold">{stats.team1.recto}</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span>Esquina:</span>
                <span className="font-bold">{stats.team1.esquina}</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span>Cruzado:</span>
                <span className="font-bold">{stats.team1.cruzado}</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span>Punto:</span>
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
                <span>Aces:</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span className="font-bold">{stats.team2.recto}</span>
                <span>Recto:</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span className="font-bold">{stats.team2.esquina}</span>
                <span>Esquina:</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span className="font-bold">{stats.team2.cruzado}</span>
                <span>Cruzado:</span>
              </div>
              <div className="text-white/90 flex justify-between">
                <span className="font-bold">{stats.team2.punto}</span>
                <span>Punto:</span>
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
  
  const player1Timeouts = match.session.player1TimeoutsUsed ? JSON.parse(match.session.player1TimeoutsUsed).length : 0;
  const player2Timeouts = match.session.player2TimeoutsUsed ? JSON.parse(match.session.player2TimeoutsUsed).length : 0;
  const stats = match.stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 py-4 px-4 pb-20 flex flex-col items-center justify-center">
      <div className="container mx-auto max-w-5xl">
        {/* PARTIDO TERMINADO */}
        <div className="text-center mb-6 animate-pulse">
          <h1 className="text-5xl font-bold text-green-400 mb-2">🏆 PARTIDO TERMINADO 🏆</h1>
          <p className="text-2xl text-white">{match.tournament.name}</p>
          <p className="text-lg text-white/80">{match.match.round}</p>
        </div>

        {/* GANADOR */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 mb-6 shadow-2xl border-4 border-yellow-400">
          <div className="text-center">
            <p className="text-white text-xl font-bold mb-3">EQUIPO GANADOR</p>
            <div className="flex items-center gap-6 justify-center">
              {winner?.photoUrl ? (
                <img
                  src={winner.photoUrl}
                  alt={winner.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-4xl font-bold text-orange-500">
                  {winner?.name.charAt(0)}
                </div>
              )}
              <h2 className="text-4xl font-bold text-white">{winner?.name}</h2>
            </div>
          </div>
        </div>

        {/* RESULTADO Y ESTADÍSTICAS */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Resultados */}
          <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 shadow-2xl">
            <h3 className="text-white text-lg font-bold text-center mb-4">RESULTADO FINAL</h3>
            
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-white/70 text-xs mb-1">Sets</p>
                <div className="flex justify-center gap-3 items-center">
                  <div className="text-4xl font-bold text-yellow-400">{match.session.player1Sets}</div>
                  <div className="text-2xl text-white/50">-</div>
                  <div className="text-4xl font-bold text-yellow-400">{match.session.player2Sets}</div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-white/70 text-xs mb-1">Puntuación Final</p>
                <div className="flex justify-center gap-3 items-center">
                  <div className="text-4xl font-bold text-yellow-400">{match.session.player1CurrentScore}</div>
                  <div className="text-2xl text-white/50">-</div>
                  <div className="text-4xl font-bold text-yellow-400">{match.session.player2CurrentScore}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          {stats && (
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 shadow-2xl">
              <h3 className="text-white text-lg font-bold text-center mb-4">ESTADÍSTICAS</h3>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-left">
                  <div className="text-white/70 mb-1">Equipo 1</div>
                  <div className="text-white/90">🎯 Aces: <span className="font-bold text-green-400">{stats.team1.aces}</span></div>
                  <div className="text-white/90">➡️ Recto: <span className="font-bold">{stats.team1.recto}</span></div>
                  <div className="text-white/90">📐 Esquina: <span className="font-bold">{stats.team1.esquina}</span></div>
                  <div className="text-white/90">↗️ Cruzado: <span className="font-bold">{stats.team1.cruzado}</span></div>
                  <div className="text-white/90">⚡ Punto: <span className="font-bold">{stats.team1.punto}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-white/70 mb-1">Equipo 2</div>
                  <div className="text-white/90"><span className="font-bold text-green-400">{stats.team2.aces}</span> 🎯 Aces</div>
                  <div className="text-white/90"><span className="font-bold">{stats.team2.recto}</span> ➡️ Recto</div>
                  <div className="text-white/90"><span className="font-bold">{stats.team2.esquina}</span> 📐 Esquina</div>
                  <div className="text-white/90"><span className="font-bold">{stats.team2.cruzado}</span> ↗️ Cruzado</div>
                  <div className="text-white/90"><span className="font-bold">{stats.team2.punto}</span> ⚡ Punto</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* JUGADORES CON FOTOS */}
        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 shadow-2xl">
          <h3 className="text-white text-lg font-bold text-center mb-4">EQUIPOS</h3>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Equipo 1 */}
            <div className="space-y-3">
              <p className="text-white/70 text-xs text-center">EQUIPO 1</p>
              <div className="flex flex-col items-center">
                {match.player1.photoUrl ? (
                  <img
                    src={match.player1.photoUrl}
                    alt={match.player1.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-white mb-2"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white mb-2">
                    {match.player1.name.charAt(0)}
                  </div>
                )}
                <p className="text-white font-bold text-sm text-center">{match.player1.name}</p>
                {match.player1.nationality && (
                  <p className="text-2xl">{getFlagEmoji(match.player1.nationality)}</p>
                )}
              </div>
              {isDoubles && match.player3 && (
                <div className="flex flex-col items-center pt-3 border-t border-white/20">
                  {match.player3.photoUrl ? (
                    <img
                      src={match.player3.photoUrl}
                      alt={match.player3.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-white mb-2"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white mb-2">
                      {match.player3.name.charAt(0)}
                    </div>
                  )}
                  <p className="text-white font-bold text-sm text-center">{match.player3.name}</p>
                  {match.player3.nationality && (
                    <p className="text-2xl">{getFlagEmoji(match.player3.nationality)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Equipo 2 */}
            <div className="space-y-3">
              <p className="text-white/70 text-xs text-center">EQUIPO 2</p>
              {match.player2 && (
                <div className="flex flex-col items-center">
                  {match.player2.photoUrl ? (
                    <img
                      src={match.player2.photoUrl}
                      alt={match.player2.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-white mb-2"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white mb-2">
                      {match.player2.name.charAt(0)}
                    </div>
                  )}
                  <p className="text-white font-bold text-sm text-center">{match.player2.name}</p>
                  {match.player2.nationality && (
                    <p className="text-2xl">{getFlagEmoji(match.player2.nationality)}</p>
                  )}
                </div>
              )}
              {isDoubles && match.player4 && (
                <div className="flex flex-col items-center pt-3 border-t border-white/20">
                  {match.player4.photoUrl ? (
                    <img
                      src={match.player4.photoUrl}
                      alt={match.player4.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-white mb-2"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white mb-2">
                      {match.player4.name.charAt(0)}
                    </div>
                  )}
                  <p className="text-white font-bold text-sm text-center">{match.player4.name}</p>
                  {match.player4.nationality && (
                    <p className="text-2xl">{getFlagEmoji(match.player4.nationality)}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Otros stats */}
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-xs">
            <div className="text-left text-white/80">
              <div>Faltas técnicas: {match.session.player1Technicals}</div>
              <div>Tiempos usados: {player1Timeouts}</div>
            </div>
            <div className="text-right text-white/80">
              <div>Faltas técnicas: {match.session.player2Technicals}</div>
              <div>Tiempos usados: {player2Timeouts}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SponsorBanner({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;

  // Duplicate sponsors for infinite scroll effect
  const sponsorsList = [...sponsors, ...sponsors];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 backdrop-blur-sm shadow-lg py-6">
      <style>{`
        @keyframes scrollSponsors {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .sponsor-scroll {
          animation: scrollSponsors 20s linear infinite;
        }
        .sponsor-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      <div className="overflow-hidden">
        <div className="sponsor-scroll flex gap-12 whitespace-nowrap py-2">
          {sponsorsList.map((sponsor, index) => (
            <div
              key={`${sponsor.id}-${index}`}
              className="flex-shrink-0 h-12 flex items-center justify-center px-6 hover:opacity-80 transition-opacity"
            >
              {sponsor.logoUrl ? (
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className="h-full max-w-[150px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-sm font-bold text-white px-4 whitespace-nowrap">
                  {sponsor.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PublicDisplayPage() {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [allMatches, setAllMatches] = useState<ActiveMatch[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastMatchCount, setLastMatchCount] = useState(0);

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
      setAllMatches(polledMatches);
    }
  }, [polledMatches]);

  // Separate active and completed matches
  const activeMatches = allMatches.filter(m => m.session.status !== 'completed' && !m.session.matchWinner);
  const completedMatches = allMatches.filter(m => m.session.status === 'completed' || m.session.matchWinner);
  
  // For rotation, prioritize active matches, then completed matches
  const displayMatches = activeMatches.length > 0 ? activeMatches : completedMatches;

  // Simple rotation timer - auto-advance every 20 seconds
  useEffect(() => {
    if (displayMatches.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentMatchIndex(prev => {
        const next = (prev + 1) % displayMatches.length;
        console.log(`[ROTATE] Moving to match ${next + 1}/${displayMatches.length}`);
        return next;
      });
    }, 20000);
    
    return () => clearInterval(timer);
  }, [displayMatches.length]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = window.location.port ? `:${window.location.port}` : '';
    const host = `${window.location.hostname}${port}`;
    const wsUrl = `${protocol}//${host}/ws/public-display${tournamentId ? `?tournamentId=${tournamentId}` : ''}`;
    
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
              setAllMatches((prevMatches) => {
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

  // Auto-rotate matches every 10 seconds (simplified rotation)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMatchIndex((prev) => {
        const nextIndex = (prev + 1) % displayMatches.length;
        console.log(`[Rotation] ${prev + 1} -> ${nextIndex + 1} of ${displayMatches.length}`);
        return nextIndex;
      });
    }, 10000); // 10 seconds for testing

    return () => clearInterval(interval);
  }, [displayMatches.length]);

  // Fetch sponsors for current tournament
  const currentMatch = displayMatches[currentMatchIndex];
  const { data: sponsors = [] } = useQuery<Sponsor[]>({
    queryKey: currentMatch ? ["/api/tournaments", currentMatch.tournament.id, "sponsors"] : [],
    enabled: !!currentMatch,
  });

  if (matchesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  if (displayMatches.length === 0) {
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

  const match = displayMatches[currentMatchIndex];
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
          {displayMatches.length > 1 && (
            <div className="mt-2 text-white/60 text-xs">
              Partido {currentMatchIndex + 1} de {displayMatches.length} {activeMatches.length < displayMatches.length ? `(${activeMatches.length} activos)` : ''}
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
