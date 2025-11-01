interface DataStream {
  matchId: string;
  timestamp: number;
  data: any;
}

interface ProcessedData {
  matchId: string;
  features: any;
  odds: any;
  predictions: any;
  timestamp: number;
}

export class DataProcessor {
  private streamBuffer: Map<string, DataStream[]> = new Map();
  private processingInterval: number | null = null;
  private subscribers: Set<(data: ProcessedData) => void> = new Set();

  startRealtimeProcessing(): void {
    if (this.processingInterval) {
      console.warn("Real-time processing already running");
      return;
    }

    this.processingInterval = window.setInterval(() => {
      this.processRealtimeStream();
    }, 5000);

    console.log("Real-time data processing started");
  }

  stopRealtimeProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log("Real-time data processing stopped");
    }
  }

  private async processRealtimeStream(): Promise<void> {
    const activeMatches = Array.from(this.streamBuffer.keys());

    for (const matchId of activeMatches) {
      const streams = this.streamBuffer.get(matchId) || [];
      
      if (streams.length > 0) {
        const latestData = streams[streams.length - 1];
        
        const processed = await this.transformData(latestData);
        
        this.notifySubscribers(processed);
        
        this.streamBuffer.set(matchId, streams.slice(-10));
      }
    }
  }

  async processBatch(data: DataStream[]): Promise<ProcessedData[]> {
    console.log(`Processing batch of ${data.length} items`);
    
    const processed: ProcessedData[] = [];
    
    for (const item of data) {
      try {
        const result = await this.transformData(item);
        processed.push(result);
      } catch (error) {
        console.error(`Error processing item ${item.matchId}:`, error);
      }
    }

    console.log(`Batch processing complete: ${processed.length} items processed`);
    return processed;
  }

  private async transformData(stream: DataStream): Promise<ProcessedData> {
    const features = this.extractFeatures(stream.data);
    const odds = this.extractOdds(stream.data);
    const predictions = await this.generatePredictions(features, odds);

    return {
      matchId: stream.matchId,
      features,
      odds,
      predictions,
      timestamp: Date.now(),
    };
  }

  private extractFeatures(data: any): any {
    return {
      homeFormScore: data.homeForm || 0.5 + Math.random() * 0.3,
      awayFormScore: data.awayForm || 0.5 + Math.random() * 0.3,
      homeGoalsAvg: data.homeGoalsAvg || 1.5 + Math.random() * 0.8,
      awayGoalsAvg: data.awayGoalsAvg || 1.2 + Math.random() * 0.7,
      homeDefenseRating: data.homeDefense || 0.6 + Math.random() * 0.2,
      awayDefenseRating: data.awayDefense || 0.6 + Math.random() * 0.2,
      headToHeadAdvantage: data.h2h || Math.random() * 0.4 - 0.2,
      venueAdvantage: data.venue || 0.1 + Math.random() * 0.1,
      recentMeetingsGoals: data.recentGoals || 2.5 + Math.random() * 1.0,
    };
  }

  private extractOdds(data: any): any {
    return {
      homeWin: data.homeOdds || 2.0 + Math.random() * 1.5,
      draw: data.drawOdds || 3.2 + Math.random() * 0.8,
      awayWin: data.awayOdds || 2.5 + Math.random() * 2.0,
      over25: data.over25Odds || 1.8 + Math.random() * 0.5,
      btts: data.bttsOdds || 1.9 + Math.random() * 0.4,
    };
  }

  private async generatePredictions(features: any, odds: any): Promise<any> {
    try {
      const response = await fetch("/api/ev-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features,
          marketOdds: odds,
        }),
      });

      if (!response.ok) {
        throw new Error("Prediction API error");
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to generate predictions:", error);
      return {
        homeWinProbability: 0.33,
        drawProbability: 0.27,
        awayWinProbability: 0.40,
        confidence: 50,
      };
    }
  }

  ingestData(matchId: string, data: any): void {
    const stream: DataStream = {
      matchId,
      timestamp: Date.now(),
      data,
    };

    if (!this.streamBuffer.has(matchId)) {
      this.streamBuffer.set(matchId, []);
    }

    this.streamBuffer.get(matchId)!.push(stream);
  }

  subscribe(callback: (data: ProcessedData) => void): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(data: ProcessedData): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in subscriber callback:", error);
      }
    });
  }

  getStreamStats(): {
    activeMatches: number;
    bufferedItems: number;
    subscribers: number;
  } {
    let bufferedItems = 0;
    this.streamBuffer.forEach((streams) => {
      bufferedItems += streams.length;
    });

    return {
      activeMatches: this.streamBuffer.size,
      bufferedItems,
      subscribers: this.subscribers.size,
    };
  }

  clearBuffer(matchId?: string): void {
    if (matchId) {
      this.streamBuffer.delete(matchId);
    } else {
      this.streamBuffer.clear();
    }
  }
}

export class BatchDataLoader {
  private batchSize: number = 50;
  private processingQueue: DataStream[] = [];

  constructor(batchSize: number = 50) {
    this.batchSize = batchSize;
  }

  async loadHistoricalData(
    startDate: Date,
    endDate: Date,
    processor: DataProcessor
  ): Promise<void> {
    console.log(`Loading historical data from ${startDate} to ${endDate}`);

    const mockData: DataStream[] = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const matchesPerDay = Math.floor(Math.random() * 20) + 10;

      for (let j = 0; j < matchesPerDay; j++) {
        mockData.push({
          matchId: `match_${date.toISOString().split("T")[0]}_${j}`,
          timestamp: date.getTime(),
          data: {
            homeForm: Math.random(),
            awayForm: Math.random(),
            homeGoalsAvg: 1 + Math.random() * 2,
            awayGoalsAvg: 1 + Math.random() * 2,
          },
        });
      }
    }

    await this.processBatches(mockData, processor);
  }

  private async processBatches(
    data: DataStream[],
    processor: DataProcessor
  ): Promise<void> {
    for (let i = 0; i < data.length; i += this.batchSize) {
      const batch = data.slice(i, i + this.batchSize);
      await processor.processBatch(batch);
      
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`Processed ${data.length} records in batches of ${this.batchSize}`);
  }

  async aggregateStats(matchIds: string[]): Promise<any> {
    const stats: any = {};

    for (const matchId of matchIds) {
      stats[matchId] = {
        totalPredictions: Math.floor(Math.random() * 1000) + 100,
        avgOdds: 2.0 + Math.random() * 2,
        accuracy: 0.5 + Math.random() * 0.3,
      };
    }

    return stats;
  }
}

const dataProcessor = new DataProcessor();
export default dataProcessor;
