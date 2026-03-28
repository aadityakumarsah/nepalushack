// Mock database to replace Firebase
// This stores data in memory for development purposes

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
  coverImage?: string;
}

interface Feedback {
  id: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

// In-memory storage
const interviews: Map<string, Interview> = new Map();
const feedbacks: Map<string, Feedback> = new Map();

// Generate unique ID
function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Interview operations
export const interviewDb = {
  add: async (interview: Omit<Interview, "id">): Promise<{ id: string }> => {
    const id = generateId();
    interviews.set(id, { ...interview, id });
    return { id };
  },

  get: async (id: string): Promise<Interview | null> => {
    return interviews.get(id) || null;
  },

  getByUserId: async (userId: string): Promise<Interview[]> => {
    return Array.from(interviews.values())
      .filter((interview) => interview.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },

  getLatest: async (
    userId: string,
    limit: number = 20
  ): Promise<Interview[]> => {
    return Array.from(interviews.values())
      .filter((interview) => interview.finalized && interview.userId !== userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  },

  getAll: async (): Promise<Interview[]> => {
    return Array.from(interviews.values());
  },

  update: async (id: string, data: Partial<Interview>): Promise<void> => {
    const interview = interviews.get(id);
    if (interview) {
      interviews.set(id, { ...interview, ...data });
    }
  },

  delete: async (id: string): Promise<void> => {
    interviews.delete(id);
  },
};

// Feedback operations
export const feedbackDb = {
  add: async (feedback: Omit<Feedback, "id">): Promise<{ id: string }> => {
    const id = generateId();
    feedbacks.set(id, { ...feedback, id });
    return { id };
  },

  get: async (id: string): Promise<Feedback | null> => {
    return feedbacks.get(id) || null;
  },

  getByInterviewId: async (
    interviewId: string,
    userId: string
  ): Promise<Feedback | null> => {
    return (
      Array.from(feedbacks.values()).find(
        (feedback) =>
          feedback.interviewId === interviewId && feedback.userId === userId
      ) || null
    );
  },

  update: async (id: string, data: Partial<Feedback>): Promise<void> => {
    const feedback = feedbacks.get(id);
    if (feedback) {
      feedbacks.set(id, { ...feedback, ...data });
    }
  },

  delete: async (id: string): Promise<void> => {
    feedbacks.delete(id);
  },
};

// Export types for use in other files
export type { Interview, Feedback };
