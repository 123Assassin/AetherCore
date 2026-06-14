type SimilarityCommentRow = {
  comments: string[];
  id: string;
  rowIndex: number;
  status: string;
};

const punctuationPattern = /[\s\p{P}\p{S}]+/gu;

export function deriveBatchCommentSimilarityWarnings(
  rows: readonly SimilarityCommentRow[],
  threshold = 0.85
): Map<string, string> {
  const warnings = new Map<string, string>();
  const successfulRows = rows
    .filter((row) => row.status === 'success')
    .map((row) => ({
      ...row,
      normalizedComment: normalizeComment(row.comments[0] ?? ''),
    }))
    .filter((row) => row.normalizedComment.length > 0);

  for (let rightIndex = 0; rightIndex < successfulRows.length; rightIndex += 1) {
    const right = successfulRows[rightIndex];

    if (!right || warnings.has(right.id)) {
      continue;
    }

    for (let leftIndex = 0; leftIndex < rightIndex; leftIndex += 1) {
      const left = successfulRows[leftIndex];

      if (!left) {
        continue;
      }

      if (getBigramJaccard(left.normalizedComment, right.normalizedComment) > threshold) {
        warnings.set(right.id, `与第 ${left.rowIndex} 行相似度过高`);
        break;
      }
    }
  }

  return warnings;
}

function normalizeComment(comment: string): string {
  return comment.toLowerCase().replace(punctuationPattern, '');
}

function getBigramJaccard(left: string, right: string): number {
  if (left === right) {
    return left ? 1 : 0;
  }

  const leftBigrams = toBigrams(left);
  const rightBigrams = toBigrams(right);

  if (leftBigrams.size === 0 || rightBigrams.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const bigram of leftBigrams) {
    if (rightBigrams.has(bigram)) {
      intersection += 1;
    }
  }

  return intersection / (leftBigrams.size + rightBigrams.size - intersection);
}

function toBigrams(value: string): Set<string> {
  if (value.length < 2) {
    return new Set(value ? [value] : []);
  }

  const bigrams = new Set<string>();

  for (let index = 0; index < value.length - 1; index += 1) {
    bigrams.add(value.slice(index, index + 2));
  }

  return bigrams;
}
