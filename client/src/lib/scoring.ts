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

// Racquetball scoring (rally scoring to 15 points)
export function calculateRacquetballScore(
  currentState: ScoreState,
  pointWinner: "player1" | "player2"
): ScoreState {
  const newState = { ...currentState };
  
  const p1Score = parseInt(newState.player1Score) || 0;
  const p2Score = parseInt(newState.player2Score) || 0;
  
  if (pointWinner === "player1") {
    const newScore = p1Score + 1;
    newState.player1Score = newScore.toString();
    
    // Win game at 15 points (or 2-point lead if tied at 14-14)
    if (newScore >= 15 && newScore - p2Score >= 2) {
      newState.player1Games++;
      newState.gameWinner = "player1";
      newState.player1Score = "0";
      newState.player2Score = "0";
      
      // Best of 3 games
      if (newState.player1Games >= 2) {
        newState.matchWinner = "player1";
      }
    }
  } else {
    const newScore = p2Score + 1;
    newState.player2Score = newScore.toString();
    
    if (newScore >= 15 && newScore - p1Score >= 2) {
      newState.player2Games++;
      newState.gameWinner = "player2";
      newState.player1Score = "0";
      newState.player2Score = "0";
      
      if (newState.player2Games >= 2) {
        newState.matchWinner = "player2";
      }
    }
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
