interface OddsData {
  bookmaker: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  over25Odds: number;
  under25Odds: number;
  timestamp: string;
}

interface TeamStats {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  recentForm: string[];
}

interface MatchData {
  homeTeam: TeamStats;
  awayTeam: TeamStats;
  venue: string;
  weather?: string;
  injuries?: string[];
}

export async function fetchSportRadarData(matchId: string): Promise<any> {
  const apiKey = process.env.SPORTRADAR_API_KEY;
  if (!apiKey) {
    throw new Error("SportRadar API key not configured");
  }

  const baseUrl = "https://api.sportradar.com/soccer/trial/v4/en";
  
  try {
    const response = await fetch(
      `${baseUrl}/matches/${matchId}/summary.json?api_key=${apiKey}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SportRadar API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("SportRadar fetch error:", error);
    return null;
  }
}

export async function fetchStatAreaData(league: string, date: string): Promise<any> {
  try {
    const response = await fetch(
      `https://www.statarea.com/api/predictions?league=${league}&date=${date}`,
      {
        headers: {
          "User-Agent": "MatchPredictz/1.0",
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn(`StatArea API returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("StatArea fetch error:", error);
    return null;
  }
}

export async function fetchOddMatrixData(matchId: string): Promise<OddsData[]> {
  try {
    const response = await fetch(
      `https://www.oddmatrix.com/api/odds/${matchId}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn(`OddMatrix API returned ${response.status}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("OddMatrix fetch error:", error);
    return [];
  }
}

export function aggregateOddsData(oddsArray: OddsData[]): {
  avgHomeOdds: number;
  avgDrawOdds: number;
  avgAwayOdds: number;
  bestHomeOdds: { bookmaker: string; odds: number };
  bestAwayOdds: { bookmaker: string; odds: number };
} {
  if (oddsArray.length === 0) {
    return {
      avgHomeOdds: 0,
      avgDrawOdds: 0,
      avgAwayOdds: 0,
      bestHomeOdds: { bookmaker: "", odds: 0 },
      bestAwayOdds: { bookmaker: "", odds: 0 },
    };
  }

  const avgHomeOdds = oddsArray.reduce((sum, o) => sum + o.homeOdds, 0) / oddsArray.length;
  const avgDrawOdds = oddsArray.reduce((sum, o) => sum + o.drawOdds, 0) / oddsArray.length;
  const avgAwayOdds = oddsArray.reduce((sum, o) => sum + o.awayOdds, 0) / oddsArray.length;

  const bestHome = oddsArray.reduce((best, current) => 
    current.homeOdds > best.homeOdds ? current : best
  );
  const bestAway = oddsArray.reduce((best, current) => 
    current.awayOdds > best.awayOdds ? current : best
  );

  return {
    avgHomeOdds: Math.round(avgHomeOdds * 100) / 100,
    avgDrawOdds: Math.round(avgDrawOdds * 100) / 100,
    avgAwayOdds: Math.round(avgAwayOdds * 100) / 100,
    bestHomeOdds: { bookmaker: bestHome.bookmaker, odds: bestHome.homeOdds },
    bestAwayOdds: { bookmaker: bestAway.bookmaker, odds: bestAway.awayOdds },
  };
}

export async function fetchHistoricalMatchData(
  homeTeam: string,
  awayTeam: string,
  limit: number = 10
): Promise<any[]> {
  const matches: any[] = [];
  
  const sportRadarData = await fetchSportRadarData(`${homeTeam}-vs-${awayTeam}`);
  if (sportRadarData) {
    matches.push(...(sportRadarData.previousMatches || []));
  }

  return matches.slice(0, limit);
}

export function calculateTeamForm(recentMatches: string[]): number {
  const points: Record<string, number> = { W: 3, D: 1, L: 0 };
  const totalPoints = recentMatches.reduce((sum, result) => sum + (points[result] || 0), 0);
  const maxPoints = recentMatches.length * 3;
  return totalPoints / maxPoints;
}

export function calculateHeadToHeadAdvantage(
  homeTeam: string,
  awayTeam: string,
  historicalMatches: any[]
): { homeWins: number; draws: number; awayWins: number; advantage: string } {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  historicalMatches.forEach((match) => {
    if (match.homeTeam === homeTeam) {
      if (match.homeScore > match.awayScore) homeWins++;
      else if (match.homeScore === match.awayScore) draws++;
      else awayWins++;
    } else {
      if (match.awayScore > match.homeScore) homeWins++;
      else if (match.homeScore === match.awayScore) draws++;
      else homeWins++;
    }
  });

  let advantage = "neutral";
  if (homeWins > awayWins * 1.5) advantage = "home";
  else if (awayWins > homeWins * 1.5) advantage = "away";

  return { homeWins, draws, awayWins, advantage };
}
