interface MatchFeatures {
  homeFormScore: number;
  awayFormScore: number;
  homeGoalsAvg: number;
  awayGoalsAvg: number;
  homeDefenseRating: number;
  awayDefenseRating: number;
  headToHeadAdvantage: number;
  venueAdvantage: number;
  recentMeetingsGoals: number;
}

interface PredictionOutput {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  over25Probability: number;
  bttsGGProbability: number;
  confidence: number;
}

export class PredictiveModel {
  private weights: {
    homeForm: number;
    awayForm: number;
    homeAttack: number;
    awayAttack: number;
    homeDefense: number;
    awayDefense: number;
    headToHead: number;
    venue: number;
  };

  constructor() {
    this.weights = {
      homeForm: 0.25,
      awayForm: 0.20,
      homeAttack: 0.15,
      awayAttack: 0.15,
      homeDefense: 0.10,
      awayDefense: 0.08,
      headToHead: 0.05,
      venue: 0.02,
    };
  }

  normalizeFeatures(features: MatchFeatures): number[] {
    return [
      Math.min(features.homeFormScore, 1.0),
      Math.min(features.awayFormScore, 1.0),
      Math.min(features.homeGoalsAvg / 4.0, 1.0),
      Math.min(features.awayGoalsAvg / 4.0, 1.0),
      Math.min(features.homeDefenseRating, 1.0),
      Math.min(features.awayDefenseRating, 1.0),
      (features.headToHeadAdvantage + 1) / 2,
      (features.venueAdvantage + 1) / 2,
      Math.min(features.recentMeetingsGoals / 5.0, 1.0),
    ];
  }

  calculateWinProbabilities(features: MatchFeatures): {
    homeWin: number;
    draw: number;
    awayWin: number;
  } {
    const normalized = this.normalizeFeatures(features);

    const homeScore =
      normalized[0] * this.weights.homeForm +
      normalized[2] * this.weights.homeAttack +
      normalized[4] * this.weights.homeDefense +
      normalized[6] * this.weights.headToHead +
      normalized[7] * this.weights.venue;

    const awayScore =
      normalized[1] * this.weights.awayForm +
      normalized[3] * this.weights.awayAttack +
      normalized[5] * this.weights.awayDefense +
      (1 - normalized[6]) * this.weights.headToHead;

    const scoreDiff = homeScore - awayScore;

    let homeWin = 0.5 + scoreDiff * 0.8;
    homeWin = Math.max(0.05, Math.min(0.85, homeWin));

    let awayWin = 0.5 - scoreDiff * 0.8;
    awayWin = Math.max(0.05, Math.min(0.85, awayWin));

    let draw = 1.0 - homeWin - awayWin;
    draw = Math.max(0.10, draw);

    const total = homeWin + draw + awayWin;
    homeWin /= total;
    draw /= total;
    awayWin /= total;

    return {
      homeWin: Math.round(homeWin * 100) / 100,
      draw: Math.round(draw * 100) / 100,
      awayWin: Math.round(awayWin * 100) / 100,
    };
  }

  predictScores(features: MatchFeatures): {
    homeGoals: number;
    awayGoals: number;
  } {
    const baseHomeGoals = features.homeGoalsAvg * 0.6 + 1.2;
    const baseAwayGoals = features.awayGoalsAvg * 0.6 + 0.8;

    const homeModifier =
      features.homeFormScore * 0.3 +
      (1 - features.awayDefenseRating) * 0.4 +
      features.venueAdvantage * 0.3;

    const awayModifier =
      features.awayFormScore * 0.3 +
      (1 - features.homeDefenseRating) * 0.4 -
      features.venueAdvantage * 0.2;

    let homeGoals = baseHomeGoals + homeModifier;
    let awayGoals = baseAwayGoals + awayModifier;

    homeGoals = Math.max(0.5, Math.min(4.5, homeGoals));
    awayGoals = Math.max(0.3, Math.min(4.0, awayGoals));

    return {
      homeGoals: Math.round(homeGoals * 10) / 10,
      awayGoals: Math.round(awayGoals * 10) / 10,
    };
  }

  calculateOver25Probability(homeGoals: number, awayGoals: number): number {
    const totalGoals = homeGoals + awayGoals;
    
    if (totalGoals >= 3.5) return 0.75 + Math.random() * 0.15;
    if (totalGoals >= 3.0) return 0.65 + Math.random() * 0.15;
    if (totalGoals >= 2.5) return 0.55 + Math.random() * 0.15;
    if (totalGoals >= 2.0) return 0.45 + Math.random() * 0.15;
    return 0.25 + Math.random() * 0.15;
  }

  calculateBTTSProbability(homeGoals: number, awayGoals: number): number {
    if (homeGoals >= 1.2 && awayGoals >= 1.0) {
      return 0.60 + Math.random() * 0.20;
    }
    if (homeGoals >= 1.0 && awayGoals >= 0.8) {
      return 0.50 + Math.random() * 0.15;
    }
    return 0.30 + Math.random() * 0.20;
  }

  calculateConfidence(probabilities: number[]): number {
    const maxProb = Math.max(...probabilities);
    const entropy = probabilities.reduce((sum, p) => {
      return p > 0 ? sum - p * Math.log2(p) : sum;
    }, 0);
    const maxEntropy = Math.log2(probabilities.length);
    const normalizedEntropy = entropy / maxEntropy;
    
    const confidence = maxProb * (1 - normalizedEntropy * 0.5);
    return Math.round(confidence * 100);
  }

  predict(features: MatchFeatures): PredictionOutput {
    const winProbs = this.calculateWinProbabilities(features);
    const scores = this.predictScores(features);
    const over25Prob = this.calculateOver25Probability(scores.homeGoals, scores.awayGoals);
    const bttsProb = this.calculateBTTSProbability(scores.homeGoals, scores.awayGoals);

    const confidence = this.calculateConfidence([
      winProbs.homeWin,
      winProbs.draw,
      winProbs.awayWin,
    ]);

    return {
      homeWinProbability: winProbs.homeWin,
      drawProbability: winProbs.draw,
      awayWinProbability: winProbs.awayWin,
      expectedHomeGoals: scores.homeGoals,
      expectedAwayGoals: scores.awayGoals,
      over25Probability: Math.round(over25Prob * 100) / 100,
      bttsGGProbability: Math.round(bttsProb * 100) / 100,
      confidence,
    };
  }

  updateWeights(newWeights: Partial<typeof this.weights>): void {
    this.weights = { ...this.weights, ...newWeights };
  }
}

export function calculateEVPlus(
  probability: number,
  odds: number,
  margin: number = 0.05
): {
  expectedValue: number;
  isValueBet: boolean;
  roi: number;
} {
  const impliedProbability = 1 / odds;
  const expectedValue = probability * odds - 1;
  const isValueBet = expectedValue > margin;
  const roi = expectedValue * 100;

  return {
    expectedValue: Math.round(expectedValue * 1000) / 1000,
    isValueBet,
    roi: Math.round(roi * 10) / 10,
  };
}

export function identifyValueBets(
  predictions: PredictionOutput,
  marketOdds: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
    btts: number;
  }
): Array<{
  market: string;
  probability: number;
  odds: number;
  ev: number;
  roi: number;
  stake: number;
}> {
  const valueBets = [];

  const markets = [
    { name: "Home Win", prob: predictions.homeWinProbability, odds: marketOdds.homeWin },
    { name: "Draw", prob: predictions.drawProbability, odds: marketOdds.draw },
    { name: "Away Win", prob: predictions.awayWinProbability, odds: marketOdds.awayWin },
    { name: "Over 2.5 Goals", prob: predictions.over25Probability, odds: marketOdds.over25 },
    { name: "BTTS Yes", prob: predictions.bttsGGProbability, odds: marketOdds.btts },
  ];

  for (const market of markets) {
    const evCalc = calculateEVPlus(market.prob, market.odds);
    if (evCalc.isValueBet) {
      const kellyFraction = (market.prob * market.odds - 1) / (market.odds - 1);
      const stake = Math.max(0, Math.min(kellyFraction * 0.25, 0.05)) * 100;

      valueBets.push({
        market: market.name,
        probability: market.prob,
        odds: market.odds,
        ev: evCalc.expectedValue,
        roi: evCalc.roi,
        stake: Math.round(stake * 10) / 10,
      });
    }
  }

  return valueBets.sort((a, b) => b.ev - a.ev);
}

const model = new PredictiveModel();
export default model;
