interface OddsUpdate {
  matchId: string;
  bookmaker: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  timestamp: number;
}

interface MarketData {
  matchId: string;
  markets: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over15: number;
    over25: number;
    over35: number;
    bttsYes: number;
    bttsNo: number;
  };
  lastUpdate: number;
}

export class OddsFeedService {
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(data: OddsUpdate) => void>> = new Map();
  private marketCache: Map<string, MarketData> = new Map();

  constructor(private feedUrl: string = "wss://odds-feed.example.com") {}

  connect(): void {
    try {
      this.wsConnection = new WebSocket(this.feedUrl);

      this.wsConnection.onopen = () => {
        console.log("Odds feed connected");
        this.reconnectAttempts = 0;
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const update: OddsUpdate = JSON.parse(event.data);
          this.handleOddsUpdate(update);
        } catch (error) {
          console.error("Failed to parse odds update:", error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.wsConnection.onclose = () => {
        console.log("Odds feed disconnected");
        this.attemptReconnect();
      };
    } catch (error) {
      console.error("Failed to connect to odds feed:", error);
      this.useFallbackPolling();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    } else {
      console.log("Max reconnection attempts reached, switching to polling");
      this.useFallbackPolling();
    }
  }

  private useFallbackPolling(): void {
    setInterval(() => {
      this.pollOddsUpdates();
    }, 5000);
  }

  private async pollOddsUpdates(): Promise<void> {
    try {
      const response = await fetch("/api/odds-updates");
      const updates: OddsUpdate[] = await response.json();
      updates.forEach((update) => this.handleOddsUpdate(update));
    } catch (error) {
      console.error("Failed to poll odds updates:", error);
    }
  }

  private handleOddsUpdate(update: OddsUpdate): void {
    const cachedMarket = this.marketCache.get(update.matchId);
    if (cachedMarket) {
      cachedMarket.markets.homeWin = update.homeOdds;
      cachedMarket.markets.draw = update.drawOdds;
      cachedMarket.markets.awayWin = update.awayOdds;
      cachedMarket.lastUpdate = update.timestamp;
    }

    const matchListeners = this.listeners.get(update.matchId);
    if (matchListeners) {
      matchListeners.forEach((callback) => callback(update));
    }

    const globalListeners = this.listeners.get("*");
    if (globalListeners) {
      globalListeners.forEach((callback) => callback(update));
    }
  }

  subscribe(matchId: string, callback: (data: OddsUpdate) => void): () => void {
    if (!this.listeners.has(matchId)) {
      this.listeners.set(matchId, new Set());
    }
    this.listeners.get(matchId)!.add(callback);

    return () => {
      const matchListeners = this.listeners.get(matchId);
      if (matchListeners) {
        matchListeners.delete(callback);
        if (matchListeners.size === 0) {
          this.listeners.delete(matchId);
        }
      }
    };
  }

  async getMarketData(matchId: string): Promise<MarketData | null> {
    const cached = this.marketCache.get(matchId);
    if (cached && Date.now() - cached.lastUpdate < 10000) {
      return cached;
    }

    try {
      const response = await fetch(`/api/odds/${matchId}`);
      const data: MarketData = await response.json();
      this.marketCache.set(matchId, data);
      return data;
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      return null;
    }
  }

  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.listeners.clear();
  }

  sendSubscription(matchIds: string[]): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(
        JSON.stringify({
          action: "subscribe",
          matchIds,
        })
      );
    }
  }
}

export function calculateOddsMovement(
  currentOdds: number,
  previousOdds: number
): { change: number; direction: "up" | "down" | "stable"; percentage: number } {
  const change = currentOdds - previousOdds;
  const percentage = ((change / previousOdds) * 100);

  let direction: "up" | "down" | "stable" = "stable";
  if (Math.abs(change) > 0.05) {
    direction = change > 0 ? "up" : "down";
  }

  return {
    change: Math.round(change * 100) / 100,
    direction,
    percentage: Math.round(percentage * 10) / 10,
  };
}

export function detectArbitrageOpportunity(markets: {
  homeWin: number;
  draw: number;
  awayWin: number;
}): { hasArbitrage: boolean; profit: number; stakes: { home: number; draw: number; away: number } } {
  const impliedProbs = {
    home: 1 / markets.homeWin,
    draw: 1 / markets.draw,
    away: 1 / markets.awayWin,
  };

  const totalImpliedProb = impliedProbs.home + impliedProbs.draw + impliedProbs.away;

  if (totalImpliedProb < 1) {
    const hasArbitrage = true;
    const profit = ((1 / totalImpliedProb - 1) * 100);

    const stakes = {
      home: (impliedProbs.home / totalImpliedProb) * 100,
      draw: (impliedProbs.draw / totalImpliedProb) * 100,
      away: (impliedProbs.away / totalImpliedProb) * 100,
    };

    return { hasArbitrage, profit: Math.round(profit * 100) / 100, stakes };
  }

  return { hasArbitrage: false, profit: 0, stakes: { home: 0, draw: 0, away: 0 } };
}

const oddsFeedService = new OddsFeedService();
export default oddsFeedService;
