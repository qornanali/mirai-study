import type { ReviewState as ReviewStateType } from "../../types";
import { reviewStateSchema } from "../../data/zod";

export class ReviewState {
  constructor(private readonly value: ReviewStateType) {}

  static create(input: ReviewStateType): ReviewState {
    const parsed = reviewStateSchema.parse(input);
    return new ReviewState(parsed);
  }

  toJSON(): ReviewStateType {
    return this.value;
  }
}
