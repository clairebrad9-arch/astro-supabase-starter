import type { Context } from "@netlify/functions";

interface OddsUpdate {
  matchId: string;
  bookmaker: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  timestamp: number;
}

function generateMockOdds(): OddsUpdate[] {
  const matches = ["match_001", "match_002", "match_003", "match_004", "match_005"];
  const bookmakers = ["Bet365", "William Hill", "888Sport", "Betfair", "Unibet"];

  return matches.map((matchId) => ({
    matchId,
    bookmaker: bookmakers[Math.floor(Math.random() * bookmakers.length)],
    homeOdds: 1.5 + Math.random() * 2,
    drawOdds: 3.0 + Math.random() * 1.5,
    awayOdds: 2.0 + Math.random() * 3,
    timestamp: Date.now(),
  }));
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId");

  const updates = generateMockOdds();

  if (matchId) {
    const filtered = updates.filter((u) => u.matchId === matchId);
    return new Response(JSON.stringify(filtered), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  return new Response(JSON.stringify(updates), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
