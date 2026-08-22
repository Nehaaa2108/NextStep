import { FilterResult } from '../filter/types.js';
import { ScoringWeights } from '../scoring/config.js';
import { OpportunityScoreResult } from '../scoring/types.js';

/**
 * Options for configuring ranking behavior and filters.
 */
export interface RankingOptions {
  /** Optional custom scoring weights */
  weights?: ScoringWeights;
  /** Reference ISO date used for deadline and temporal calculations */
  referenceDate?: string;
  /** Enable strict location filtering */
  strictLocation?: boolean;
  /** Minimum score threshold to include in final ranked list (default: 0) */
  minScoreThreshold?: number;
}

/**
 * A scored opportunity assigned a 1-indexed deterministic rank.
 */
export interface RankedOpportunity extends OpportunityScoreResult {
  /** 1-indexed ranking position */
  rank: number;
}

/**
 * Result of the ranking stage.
 */
export interface RankingResult {
  /** Deterministically ordered list of ranked opportunities */
  rankedOpportunities: RankedOpportunity[];
  /** Summary of hard filter decisions */
  filterResult: FilterResult;
  /** Count of candidate opportunities evaluated */
  totalEvaluated: number;
  /** Count of opportunities included in the ranked list */
  totalRanked: number;
}
