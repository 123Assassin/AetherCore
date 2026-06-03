export type MeProfile = {
  id: string;
  email: string;
  name: string | null;
};

export type MePreferences = {
  grade: string | null;
  subject: string | null;
};

export type MeCredits = {
  balance: number;
  cycleLimit: number;
  cycleDays: number;
  resetAt: string | null;
};
