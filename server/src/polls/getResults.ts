import { Nominations, Rankings, Results } from 'shared';

export default (
  rankings: Rankings,
  nominations: Nominations,
  votesPerVoter: number,
): Results => {
  const scores: { [nominationID: string]: number } = {};

  Object.values(rankings).forEach((userRankings) => {
    userRankings.forEach((nominationID, n) => {
      const voteValue = Math.pow(
        (votesPerVoter - 0.5 * n) / votesPerVoter,
        n + 1,
      );

      scores[nominationID] = (scores[nominationID] ?? 0) + voteValue;
    });
  });

  const results = Object.entries(scores).map(([nominationID, score]) => ({
    nominationID,
    nominationText: nominations[nominationID].text,
    score,
  }));

  results.sort((r1, r2) => r2.score - r1.score);

  return results;
};
