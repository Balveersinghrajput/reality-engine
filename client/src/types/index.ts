export interface User {
    id: string;
    username: string;
    email: string;
    profilePic?: string;
    targetTrack: string;
    level: string;
    mode: string;
    tier: string;
    masteryPercent: number;
    realityScore: number;
    streakCurrent: number;
    streakLongest: number;
    trackRank: number;
    trackRankTotal: number;
    platformRank: number;
    platformRankTotal: number;
    createdAt: string;
  }
  
  export interface Ranks {
    batchRank: number;
    batchTotal: number;
    batchCode: string;
    trackRank: number;
    trackRankTotal: number;
    platformRank: number;
    platformRankTotal: number;
    weeklyMovement: number;
  }
  
  export interface Dashboard {
    profile: User;
    performance: {
      masteryPercent: number;
      realityScore: number;
      performanceScore: number;
      taskCompletionRate: number;
      totalTasks: number;
      completedTasks: number;
      streakCurrent: number;
      streakLongest: number;
    };
    ranks: Ranks;
    recentTests: any[];
    realityScore: any;
  }
  
  export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    profilePic?: string;
    tier: string;
    level: string;
    performanceScore: number;
    trackRank: number;
    platformRank: number;
    streakCurrent: number;
    masteryPercent: number;
    weeklyMovement?: number;
    isCurrentUser: boolean;
  }
  
  export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }