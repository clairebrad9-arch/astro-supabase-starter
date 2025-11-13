interface UserLevel {
  level: number;
  xp: number;
  xpToNextLevel: number;
  title: string;
}

interface Streak {
  current: number;
  longest: number;
  lastPredictionDate: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: "daily" | "weekly" | "monthly";
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  expiresAt: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export class GamificationService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  getUserLevel(): UserLevel {
    const xp = this.getUserXP();
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpToNextLevel = xpForNextLevel - xp;

    const titles = [
      "Rookie Bettor",
      "Amateur Predictor",
      "Skilled Analyst",
      "Expert Strategist",
      "Master Forecaster",
      "Elite Tipster",
      "Legendary Oracle",
    ];

    const titleIndex = Math.min(Math.floor(level / 5), titles.length - 1);

    return {
      level,
      xp,
      xpToNextLevel,
      title: titles[titleIndex],
    };
  }

  getUserXP(): number {
    const xp = localStorage.getItem(`xp_${this.userId}`);
    return xp ? parseInt(xp) : 0;
  }

  addXP(amount: number): { xpGained: number; leveledUp: boolean; newLevel?: number } {
    const currentLevel = this.getUserLevel().level;
    const currentXP = this.getUserXP();
    const newXP = currentXP + amount;

    localStorage.setItem(`xp_${this.userId}`, newXP.toString());

    const newLevel = this.getUserLevel().level;
    const leveledUp = newLevel > currentLevel;

    return {
      xpGained: amount,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
    };
  }

  getStreak(): Streak {
    const streakData = localStorage.getItem(`streak_${this.userId}`);
    if (streakData) {
      return JSON.parse(streakData);
    }
    return {
      current: 0,
      longest: 0,
      lastPredictionDate: "",
    };
  }

  updateStreak(): { current: number; bonusXP: number; streakMilestone?: number } {
    const today = new Date().toISOString().split("T")[0];
    const streak = this.getStreak();
    const lastDate = streak.lastPredictionDate;

    if (lastDate === today) {
      return { current: streak.current, bonusXP: 0 };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastDate === yesterdayStr) {
      streak.current += 1;
    } else {
      streak.current = 1;
    }

    if (streak.current > streak.longest) {
      streak.longest = streak.current;
    }

    streak.lastPredictionDate = today;
    localStorage.setItem(`streak_${this.userId}`, JSON.stringify(streak));

    const bonusXP = this.calculateStreakBonus(streak.current);
    this.addXP(bonusXP);

    const streakMilestone = [7, 14, 30, 50, 100].find((m) => streak.current === m);

    return {
      current: streak.current,
      bonusXP,
      streakMilestone,
    };
  }

  private calculateStreakBonus(streakCount: number): number {
    if (streakCount >= 30) return 100;
    if (streakCount >= 14) return 50;
    if (streakCount >= 7) return 25;
    if (streakCount >= 3) return 10;
    return 5;
  }

  getChallenges(): Challenge[] {
    const challengesData = localStorage.getItem(`challenges_${this.userId}`);
    if (challengesData) {
      return JSON.parse(challengesData);
    }

    return this.generateChallenges();
  }

  private generateChallenges(): Challenge[] {
    const now = new Date();
    const challenges: Challenge[] = [
      {
        id: "daily_predictions",
        name: "Daily Predictor",
        description: "Make 5 predictions today",
        type: "daily",
        target: 5,
        progress: 0,
        reward: 50,
        completed: false,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "weekly_accuracy",
        name: "Accuracy Master",
        description: "Achieve 70% accuracy this week",
        type: "weekly",
        target: 70,
        progress: 0,
        reward: 200,
        completed: false,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "monthly_profit",
        name: "Profit Hunter",
        description: "Make 20+ positive EV bets this month",
        type: "monthly",
        target: 20,
        progress: 0,
        reward: 500,
        completed: false,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    localStorage.setItem(`challenges_${this.userId}`, JSON.stringify(challenges));
    return challenges;
  }

  updateChallengeProgress(challengeId: string, progress: number): void {
    const challenges = this.getChallenges();
    const challenge = challenges.find((c) => c.id === challengeId);

    if (challenge && !challenge.completed) {
      challenge.progress = Math.min(progress, challenge.target);
      
      if (challenge.progress >= challenge.target) {
        challenge.completed = true;
        this.addXP(challenge.reward);
      }

      localStorage.setItem(`challenges_${this.userId}`, JSON.stringify(challenges));
    }
  }

  getAchievements(): Achievement[] {
    const achievementsData = localStorage.getItem(`achievements_${this.userId}`);
    if (achievementsData) {
      return JSON.parse(achievementsData);
    }

    return this.getAllAchievements();
  }

  private getAllAchievements(): Achievement[] {
    return [
      {
        id: "first_prediction",
        name: "First Steps",
        description: "Make your first prediction",
        icon: "🎯",
      },
      {
        id: "streak_7",
        name: "Week Warrior",
        description: "Maintain a 7-day streak",
        icon: "🔥",
      },
      {
        id: "streak_30",
        name: "Monthly Master",
        description: "Maintain a 30-day streak",
        icon: "⭐",
      },
      {
        id: "level_10",
        name: "Veteran",
        description: "Reach level 10",
        icon: "🏆",
      },
      {
        id: "profit_100",
        name: "Century Club",
        description: "Make 100 profitable predictions",
        icon: "💰",
      },
      {
        id: "accuracy_80",
        name: "Sharp Shooter",
        description: "Achieve 80% accuracy over 50 predictions",
        icon: "🎖️",
      },
    ];
  }

  unlockAchievement(achievementId: string): boolean {
    const achievements = this.getAchievements();
    const achievement = achievements.find((a) => a.id === achievementId);

    if (achievement && !achievement.unlockedAt) {
      achievement.unlockedAt = new Date().toISOString();
      localStorage.setItem(`achievements_${this.userId}`, JSON.stringify(achievements));
      this.addXP(100);
      return true;
    }

    return false;
  }

  checkAchievements(): Achievement[] {
    const unlocked: Achievement[] = [];
    const level = this.getUserLevel().level;
    const streak = this.getStreak();

    if (level >= 10) {
      if (this.unlockAchievement("level_10")) {
        unlocked.push(this.getAchievements().find((a) => a.id === "level_10")!);
      }
    }

    if (streak.current >= 7) {
      if (this.unlockAchievement("streak_7")) {
        unlocked.push(this.getAchievements().find((a) => a.id === "streak_7")!);
      }
    }

    if (streak.current >= 30) {
      if (this.unlockAchievement("streak_30")) {
        unlocked.push(this.getAchievements().find((a) => a.id === "streak_30")!);
      }
    }

    return unlocked;
  }

  getLeaderboard(): Array<{ userId: string; username: string; level: number; xp: number }> {
    const mockLeaderboard = [
      { userId: "user1", username: "BetMaster99", level: 15, xp: 22500 },
      { userId: "user2", username: "PredictPro", level: 12, xp: 14400 },
      { userId: "user3", username: "OddsWizard", level: 10, xp: 10000 },
      { userId: this.userId, username: "You", ...this.getUserLevel() },
    ];

    return mockLeaderboard.sort((a, b) => b.xp - a.xp);
  }
}
