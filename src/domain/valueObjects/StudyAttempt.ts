import type { StudyAttempt as StudyAttemptType } from "../../types";
import { studyAttemptSchema } from "../../data/zod";

export class StudyAttempt {
  constructor(private readonly value: StudyAttemptType) {}

  static create(input: StudyAttemptType): StudyAttempt {
    const parsed = studyAttemptSchema.parse(input);
    return new StudyAttempt(parsed);
  }

  toJSON(): StudyAttemptType {
    return this.value;
  }
}
