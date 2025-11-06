// Scoring logic for padel and racquetball

export interface ScoreState {
  player1Score: string;
  player2Score: string;
  player1Games: number;
  player2Games: number;
  player1Sets: number;
  player2Sets: number;
  currentSet: number;
  gameWinner?: string;
  setWinner?: string;
  matchWinner?: string;
}

// Open IRT scoring state (for racquetball)
export interface OpenIRTScoreState {
  player1Score: number;
  player2Score: number;
  player1Sets: number;
  player2Sets: number;
  currentSet: number;
  serverId: string; // ID of the player currently serving
  player1Id: string;
  player2Id: string;
  setWinner?: string;
  matchWinner?: string;
  serverChanged?: boolean; // Indicates if server changed this point
}

// Padel scoring (15, 30, 40, game)
export function calculatePadelScore(
  currentState: ScoreState,
  pointWinner: "player1" | "player2"
): ScoreState {
  const newState = { ...currentState };
  
  const padelPoints = ["0", "15", "30", "40"];
  
  const p1Index = padelPoints.indexOf(newState.player1Score);
  const p2Index = padelPoints.indexOf(newState.player2Score);
  
  if (pointWinner === "player1") {
    if (p1Index < 3) {
      // Regular scoring
      newState.player1Score = padelPoints[p1Index + 1];
    } else if (p1Index === 3) {
      // Player 1 at 40
      if (p2Index < 3) {
        // Player 1 wins game
        newState.player1Games++;
        newState.player1Score = "0";
        newState.player2Score = "0";
        newState.gameWinner = "player1";
        
        // Check if set is won (first to 6 games, 2-game lead)
        if (newState.player1Games >= 6 && newState.player1Games - newState.player2Games >= 2) {
          newState.player1Sets++;
          newState.setWinner = "player1";
          newState.player1Games = 0;
          newState.player2Games = 0;
          newState.currentSet++;
          
          // Check if match is won (best of 3 sets)
          if (newState.player1Sets >= 2) {
            newState.matchWinner = "player1";
          }
        }
      } else {
        // Both at 40 (deuce) - go to advantage
        newState.player1Score = "AD";
        newState.player2Score = "";
      }
    } else if (newState.player1Score === "AD") {
      // Player 1 at advantage wins game
      newState.player1Games++;
      newState.player1Score = "0";
      newState.player2Score = "0";
      newState.gameWinner = "player1";
      
      if (newState.player1Games >= 6 && newState.player1Games - newState.player2Games >= 2) {
        newState.player1Sets++;
        newState.setWinner = "player1";
        newState.player1Games = 0;
        newState.player2Games = 0;
        newState.currentSet++;
        
        if (newState.player1Sets >= 2) {
          newState.matchWinner = "player1";
        }
      }
    } else if (newState.player2Score === "AD") {
      // Player 2 at advantage, back to deuce
      newState.player1Score = "40";
      newState.player2Score = "40";
    }
  } else {
    // player2 wins point
    if (p2Index < 3) {
      newState.player2Score = padelPoints[p2Index + 1];
    } else if (p2Index === 3) {
      if (p1Index < 3) {
        newState.player2Games++;
        newState.player1Score = "0";
        newState.player2Score = "0";
        newState.gameWinner = "player2";
        
        if (newState.player2Games >= 6 && newState.player2Games - newState.player1Games >= 2) {
          newState.player2Sets++;
          newState.setWinner = "player2";
          newState.player1Games = 0;
          newState.player2Games = 0;
          newState.currentSet++;
          
          if (newState.player2Sets >= 2) {
            newState.matchWinner = "player2";
          }
        }
      } else {
        newState.player2Score = "AD";
        newState.player1Score = "";
      }
    } else if (newState.player2Score === "AD") {
      newState.player2Games++;
      newState.player1Score = "0";
      newState.player2Score = "0";
      newState.gameWinner = "player2";
      
      if (newState.player2Games >= 6 && newState.player2Games - newState.player1Games >= 2) {
        newState.player2Sets++;
        newState.setWinner = "player2";
        newState.player1Games = 0;
        newState.player2Games = 0;
        newState.currentSet++;
        
        if (newState.player2Sets >= 2) {
          newState.matchWinner = "player2";
        }
      }
    } else if (newState.player1Score === "AD") {
      newState.player1Score = "40";
      newState.player2Score = "40";
    }
  }
  
  return newState;
}

// Racquetball scoring (rally scoring to 15 points per set, best of 3 sets)
// Rules: First to 15 points wins the set (2-point lead required)
//        First to 2 sets wins the match
//        If tied 1-1, third set is to 11 points (2-point lead required)
export function calculateRacquetballScore(
  currentState: ScoreState,
  pointWinner: "player1" | "player2"
): ScoreState {
  const newState = { ...currentState };
  
  const p1Score = parseInt(newState.player1Score) || 0;
  const p2Score = parseInt(newState.player2Score) || 0;
  
  // Determine points needed to win current set
  const isTiebreakSet = newState.player1Sets === 1 && newState.player2Sets === 1;
  const pointsToWin = isTiebreakSet ? 11 : 15;
  
  if (pointWinner === "player1") {
    const newScore = p1Score + 1;
    newState.player1Score = newScore.toString();
    
    // Win set at required points (with 2-point lead)
    if (newScore >= pointsToWin && newScore - p2Score >= 2) {
      newState.player1Sets++;
      newState.setWinner = "player1";
      newState.player1Score = "0";
      newState.player2Score = "0";
      newState.currentSet++;
      
      // Best of 3 sets - first to 2 wins match
      if (newState.player1Sets >= 2) {
        newState.matchWinner = "player1";
      }
    }
  } else {
    const newScore = p2Score + 1;
    newState.player2Score = newScore.toString();
    
    if (newScore >= pointsToWin && newScore - p1Score >= 2) {
      newState.player2Sets++;
      newState.setWinner = "player2";
      newState.player1Score = "0";
      newState.player2Score = "0";
      newState.currentSet++;
      
      if (newState.player2Sets >= 2) {
        newState.matchWinner = "player2";
      }
    }
  }
  
  return newState;
}

// Open IRT scoring (for racquetball)
// Rules: 
// - Only the server can score points
// - If the receiver wins the rally, they become the server (but no point is added)
// - Sets 1 and 2: First to 15 points (2-point lead required)
// - Set 3 (tiebreak): First to 11 points (2-point lead required)
// - Best of 3 sets
export function calculateOpenIRTScore(
  currentState: OpenIRTScoreState,
  pointWinner: "player1" | "player2"
): OpenIRTScoreState {
  const newState = { ...currentState };
  const winnerIsPlayer1 = pointWinner === "player1";
  const winnerId = winnerIsPlayer1 ? newState.player1Id : newState.player2Id;
  
  // Determine if winner is the current server
  const winnerIsServer = winnerId === newState.serverId;
  
  // Determine points needed to win current set
  const isTiebreakSet = newState.player1Sets === 1 && newState.player2Sets === 1;
  const pointsToWin = isTiebreakSet ? 11 : 15;
  
  if (winnerIsServer) {
    // Server won: add point to their score
    if (winnerIsPlayer1) {
      newState.player1Score++;
      
      // Check if player1 wins the set
      if (newState.player1Score >= pointsToWin && newState.player1Score - newState.player2Score >= 2) {
        newState.player1Sets++;
        newState.setWinner = "player1";
        newState.player1Score = 0;
        newState.player2Score = 0;
        newState.currentSet++;
        
        // Check if player1 wins the match (best of 3)
        if (newState.player1Sets >= 2) {
          newState.matchWinner = "player1";
        }
      }
    } else {
      newState.player2Score++;
      
      // Check if player2 wins the set
      if (newState.player2Score >= pointsToWin && newState.player2Score - newState.player1Score >= 2) {
        newState.player2Sets++;
        newState.setWinner = "player2";
        newState.player1Score = 0;
        newState.player2Score = 0;
        newState.currentSet++;
        
        // Check if player2 wins the match
        if (newState.player2Sets >= 2) {
          newState.matchWinner = "player2";
        }
      }
    }
    newState.serverChanged = false;
  } else {
    // Receiver won: change server (no point added)
    newState.serverId = winnerId;
    newState.serverChanged = true;
  }
  
  return newState;
}

export function calculateScore(
  sport: "padel" | "racquetball",
  currentState: ScoreState,
  pointWinner: "player1" | "player2"
): ScoreState {
  if (sport === "padel") {
    return calculatePadelScore(currentState, pointWinner);
  } else {
    return calculateRacquetballScore(currentState, pointWinner);
  }
}
