export function getCommentCopyText(comment: string) {
  return comment
    .replace(/```[\w-]*\n?([\s\S]*?)\n?```\n?/g, '$1\n')
    .replace(/~~~[\w-]*\n?([\s\S]*?)\n?~~~\n?/g, '$1\n')
    .split(/\r?\n/)
    .filter((line) => !isMarkdownFenceLine(line))
    .map(stripMarkdownSyntax)
    .join('\n')
    .trim();
}

function isMarkdownFenceLine(line: string) {
  return /^\s*(?:`{3,}|~{3,}).*$/.test(line);
}

function stripMarkdownSyntax(line: string) {
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+[.)、]\s+/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
}
