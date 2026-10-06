export type UserRole = "admin" | "station-master" | "coach-monitor";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  assignedCoaches: string[] | "all";
  createdAt: number;
}

export interface SensorReading {
  smoke: number;
  temperature: number;
  flame: boolean;
  timestamp: number;
}

export type CoachState = "NORMAL" | "FIRE";

export interface CoachStatus {
  state: CoachState;
  lastUpdated: number;
}

export interface CoachMeta {
  name: string;
  train: string;
  location: string;
}

export interface Coach {
  id: string;
  meta?: CoachMeta;
  sensors?: SensorReading;
  status?: CoachStatus;
}

export interface FireAlert {
  id: string;
  coachId: string;
  type: "FIRE";
  smoke: number;
  temperature: number;
  flame: boolean;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}
