import { z } from "zod";
import { studyModuleSchema } from "./entities";

const leitnerStateSchema = z.object({
  box: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  successfulReviews: z.number().int().min(0),
});

const sm2StateSchema = z.object({
  easinessFactor: z.number().min(1.3),
  intervalDays: z.number().int().min(0),
  repetition: z.number().int().min(0),
});

export const reviewStateSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  module: studyModuleSchema,
  algorithm: z.enum(["leitner", "sm2"]),
  dueAt: z.string().datetime(),
  lastReviewedAt: z.string().datetime().optional(),
  leitner: leitnerStateSchema.optional(),
  sm2: sm2StateSchema.optional(),
});

export const gradingResultSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number().min(0).max(1),
  normalizedExpected: z.string(),
  normalizedActual: z.string(),
});

export const studyAttemptSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  module: studyModuleSchema,
  expectedAnswer: z.string(),
  userAnswer: z.string(),
  createdAt: z.string().datetime(),
  result: gradingResultSchema,
});

export const userProgressSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  module: studyModuleSchema,
  streak: z.number().int().min(0),
  totalAttempts: z.number().int().min(0),
  correctAttempts: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});

export const progressSnapshotSchema = z.object({
  id: z.string().min(1),
  capturedAt: z.string().datetime(),
  totalItems: z.number().int().min(0),
  dueItems: z.number().int().min(0),
  moduleBreakdown: z.object({
    reading: z.number().int().min(0),
    writing: z.number().int().min(0),
    listening: z.number().int().min(0),
    kanji: z.number().int().min(0),
  }),
});

export const progressRecordSchema = z.object({
  attempt: studyAttemptSchema,
  reviewState: reviewStateSchema,
  userProgress: userProgressSchema,
});
