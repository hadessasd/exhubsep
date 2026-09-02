/** Seed totals for live score — photo vouches are separate (ScoreVouches). */
export type VouchReview = {
  id: string;
  display_name: string;
  stars: number;
  comment: string;
  service: string;
  created_at: string;
  verified: true;
  location?: string;
};

/** No text review cards on homepage — photo vouches only at top. */
export const VOUCH_REVIEWS: VouchReview[] = [];

export const RATING_SEED_COUNT = 755;
export const RATING_SEED_AVG = 4.4;
