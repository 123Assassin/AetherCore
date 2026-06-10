export function getCommentCopyText(comment: string) {
  return comment
    .split(/\r?\n/)
    .filter((line) => !isMarkdownFenceLine(line))
    .join('\n')
    .trim();
}

function isMarkdownFenceLine(line: string) {
  return /^\s*(?:`{3,}|~{3,}).*$/.test(line);
}
