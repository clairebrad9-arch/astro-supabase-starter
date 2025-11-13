interface Match {
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  predictions: {
    homeWin: { probability: number; odds: string; confidence: string };
    awayWin: { probability: number; odds: string; confidence: string };
    draw: { probability: number; odds: string; confidence: string };
    over25: { probability: number; odds: string; confidence: string };
    over15: { probability: number; odds: string; confidence: string };
    over35: { probability: number; odds: string; confidence: string };
    gg: { probability: number; odds: string; confidence: string };
    ng: { probability: number; odds: string; confidence: string };
    firstHalfHomeWin: { probability: number; odds: string; confidence: string };
    secondHalfHomeWin: { probability: number; odds: string; confidence: string };
  };
}

function calculateOdds(probability: number): string {
  return (1 / probability).toFixed(2);
}

function getConfidence(probability: number): string {
  if (probability >= 0.65) return "High";
  if (probability >= 0.50) return "Medium";
  return "Low";
}

function generatePredictions() {
  const homeWinProb = 0.45 + Math.random() * 0.30;
  const awayWinProb = 0.25 + Math.random() * 0.25;
  const drawProb = 1 - homeWinProb - awayWinProb;
  
  const over15Prob = 0.75 + Math.random() * 0.20;
  const over25Prob = 0.55 + Math.random() * 0.25;
  const over35Prob = 0.30 + Math.random() * 0.25;
  
  const ggProb = 0.50 + Math.random() * 0.25;
  const ngProb = 1 - ggProb;
  
  const firstHalfHomeWinProb = 0.35 + Math.random() * 0.25;
  const secondHalfHomeWinProb = 0.40 + Math.random() * 0.25;

  return {
    homeWin: {
      probability: Math.round(homeWinProb * 100) / 100,
      odds: calculateOdds(homeWinProb),
      confidence: getConfidence(homeWinProb),
    },
    awayWin: {
      probability: Math.round(awayWinProb * 100) / 100,
      odds: calculateOdds(awayWinProb),
      confidence: getConfidence(awayWinProb),
    },
    draw: {
      probability: Math.round(drawProb * 100) / 100,
      odds: calculateOdds(drawProb),
      confidence: getConfidence(drawProb),
    },
    over25: {
      probability: Math.round(over25Prob * 100) / 100,
      odds: calculateOdds(over25Prob),
      confidence: getConfidence(over25Prob),
    },
    over15: {
      probability: Math.round(over15Prob * 100) / 100,
      odds: calculateOdds(over15Prob),
      confidence: getConfidence(over15Prob),
    },
    over35: {
      probability: Math.round(over35Prob * 100) / 100,
      odds: calculateOdds(over35Prob),
      confidence: getConfidence(over35Prob),
    },
    gg: {
      probability: Math.round(ggProb * 100) / 100,
      odds: calculateOdds(ggProb),
      confidence: getConfidence(ggProb),
    },
    ng: {
      probability: Math.round(ngProb * 100) / 100,
      odds: calculateOdds(ngProb),
      confidence: getConfidence(ngProb),
    },
    firstHalfHomeWin: {
      probability: Math.round(firstHalfHomeWinProb * 100) / 100,
      odds: calculateOdds(firstHalfHomeWinProb),
      confidence: getConfidence(firstHalfHomeWinProb),
    },
    secondHalfHomeWin: {
      probability: Math.round(secondHalfHomeWinProb * 100) / 100,
      odds: calculateOdds(secondHalfHomeWinProb),
      confidence: getConfidence(secondHalfHomeWinProb),
    },
  };
}

export default async () => {
  const majorLeagues = [
    {
      name: "Premier League",
      matches: [
        { homeTeam: "Manchester City", awayTeam: "Liverpool", date: "Saturday, 15:00" },
        { homeTeam: "Arsenal", awayTeam: "Chelsea", date: "Saturday, 17:30" },
        { homeTeam: "Manchester United", awayTeam: "Tottenham", date: "Sunday, 14:00" },
      ]
    },
    {
      name: "La Liga",
      matches: [
        { homeTeam: "Real Madrid", awayTeam: "Barcelona", date: "Saturday, 20:00" },
        { homeTeam: "Atletico Madrid", awayTeam: "Sevilla", date: "Sunday, 18:30" },
        { homeTeam: "Valencia", awayTeam: "Real Sociedad", date: "Sunday, 16:00" },
      ]
    },
    {
      name: "Bundesliga",
      matches: [
        { homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", date: "Sunday, 17:30" },
        { homeTeam: "RB Leipzig", awayTeam: "Bayer Leverkusen", date: "Saturday, 15:30" },
        { homeTeam: "Eintracht Frankfurt", awayTeam: "Borussia Monchengladbach", date: "Saturday, 18:30" },
      ]
    },
    {
      name: "Serie A",
      matches: [
        { homeTeam: "Inter Milan", awayTeam: "AC Milan", date: "Sunday, 19:45" },
        { homeTeam: "Juventus", awayTeam: "Napoli", date: "Saturday, 19:45" },
        { homeTeam: "Roma", awayTeam: "Lazio", date: "Sunday, 17:00" },
      ]
    },
    {
      name: "Ligue 1",
      matches: [
        { homeTeam: "PSG", awayTeam: "Marseille", date: "Sunday, 20:45" },
        { homeTeam: "Monaco", awayTeam: "Lyon", date: "Saturday, 21:00" },
        { homeTeam: "Lille", awayTeam: "Nice", date: "Sunday, 15:00" },
      ]
    }
  ];

  const allMatches: Match[] = [];

  for (const league of majorLeagues) {
    for (const match of league.matches) {
      allMatches.push({
        league: league.name,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        date: match.date,
        predictions: generatePredictions(),
      });
    }
  }

  return new Response(JSON.stringify({ matches: allMatches, lastUpdated: new Date().toISOString() }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
};
