import type { UserProgress as UserProgressType } from "../../types";
import { userProgressSchema } from "../../data/zod";

export class UserProgress {
  constructor(private readonly value: UserProgressType) {}

  static create(input: UserProgressType): UserProgress {
    const parsed = userProgressSchema.parse(input);
    return new UserProgress(parsed);
  }

  toJSON(): UserProgressType {
    return this.value;
  }
}
