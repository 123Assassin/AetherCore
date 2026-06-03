import { inflateRawSync } from 'node:zlib';

import type { CommentUploadRowInput } from './comments.service.js';

type ZipEntry = {
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
  name: string;
};

type ParsedSheetRow = Record<number, string>;

type UploadColumnMap = {
  nickname: number;
  gender: number;
  grade: number;
  tags: number;
  keywords: number;
};

const eocdSignature = 0x06054b50;
const centralDirectorySignature = 0x02014b50;
const localFileHeaderSignature = 0x04034b50;
const supportedCompressionMethods = new Set([0, 8]);
const defaultColumnMap: UploadColumnMap = {
  nickname: 0,
  gender: 1,
  grade: 2,
  tags: 3,
  keywords: 4,
};
const gradeNumberMap: Record<string, string> = {
  '1': '一年级',
  '2': '二年级',
  '3': '三年级',
  '4': '四年级',
  '5': '五年级',
  '6': '六年级',
  '7': '七年级',
  '8': '八年级',
  '9': '九年级',
};
const gradeChineseNumberMap: Record<string, string> = {
  一: '一年级',
  二: '二年级',
  三: '三年级',
  四: '四年级',
  五: '五年级',
  六: '六年级',
  七: '七年级',
  八: '八年级',
  九: '九年级',
};

export class CommentUploadXlsxError extends Error {}

export function parseCommentUploadXlsx(contentBase64: string): CommentUploadRowInput[] {
  const workbook = readZipEntries(Buffer.from(contentBase64, 'base64'));
  const sheetXml = workbook.get('xl/worksheets/sheet1.xml')?.toString('utf8');

  if (!sheetXml) {
    throw new CommentUploadXlsxError('Excel 文件缺少工作表内容。');
  }

  const sharedStrings = parseSharedStrings(workbook.get('xl/sharedStrings.xml')?.toString('utf8'));
  const sheetRows = parseSheetRows(sheetXml, sharedStrings);

  if (sheetRows.length < 2) {
    throw new CommentUploadXlsxError('Excel 文件至少需要包含表头和一行学生数据。');
  }

  const columnMap = resolveColumnMap(sheetRows[0] ?? {});
  const uploadRows = sheetRows
    .slice(1)
    .filter((row) => hasParsedRowContent(row, columnMap))
    .map((row) => toCommentUploadRow(row, columnMap))
    .filter((row) => hasUploadRowContent(row));

  if (uploadRows.length === 0) {
    throw new CommentUploadXlsxError('Excel 文件没有可导入的学生数据。');
  }

  return uploadRows;
}

function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map<string, Buffer>();

  for (let index = 0; index < entryCount; index += 1) {
    const entry = readCentralDirectoryEntry(buffer, centralDirectoryOffset);

    if (!supportedCompressionMethods.has(entry.compressionMethod)) {
      throw new CommentUploadXlsxError('Excel 文件包含暂不支持的压缩格式。');
    }

    entries.set(entry.name, readZipEntryContent(buffer, entry));
    centralDirectoryOffset = entry.nextOffset;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      return offset;
    }
  }

  throw new CommentUploadXlsxError('Excel 文件结构无效。');
}

function readCentralDirectoryEntry(
  buffer: Buffer,
  offset: number
): ZipEntry & { nextOffset: number } {
  if (buffer.readUInt32LE(offset) !== centralDirectorySignature) {
    throw new CommentUploadXlsxError('Excel 文件目录结构无效。');
  }

  const compressionMethod = buffer.readUInt16LE(offset + 10);
  const compressedSize = buffer.readUInt32LE(offset + 20);
  const fileNameLength = buffer.readUInt16LE(offset + 28);
  const extraFieldLength = buffer.readUInt16LE(offset + 30);
  const fileCommentLength = buffer.readUInt16LE(offset + 32);
  const localHeaderOffset = buffer.readUInt32LE(offset + 42);
  const fileNameStart = offset + 46;
  const fileNameEnd = fileNameStart + fileNameLength;

  return {
    compressionMethod,
    compressedSize,
    localHeaderOffset,
    name: buffer.subarray(fileNameStart, fileNameEnd).toString('utf8'),
    nextOffset: fileNameEnd + extraFieldLength + fileCommentLength,
  };
}

function readZipEntryContent(buffer: Buffer, entry: ZipEntry): Buffer {
  const localHeaderOffset = entry.localHeaderOffset;

  if (buffer.readUInt32LE(localHeaderOffset) !== localFileHeaderSignature) {
    throw new CommentUploadXlsxError('Excel 文件内容结构无效。');
  }

  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraFieldLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const contentOffset = localHeaderOffset + 30 + fileNameLength + extraFieldLength;
  const compressedContent = buffer.subarray(contentOffset, contentOffset + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return compressedContent;
  }

  return inflateRawSync(compressedContent);
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) {
    return [];
  }

  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const value = match[1] ?? '';
    const textParts = [...value.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)];

    return textParts.map((textMatch) => unescapeXml(textMatch[1] ?? '')).join('');
  });
}

function parseSheetRows(xml: string, sharedStrings: string[]): ParsedSheetRow[] {
  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const cells = rowMatch[1] ?? '';
    const row: ParsedSheetRow = {};

    for (const cellMatch of cells.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1] ?? '';
      const body = cellMatch[2] ?? '';
      const cellRef = readXmlAttribute(attributes, 'r');

      if (!cellRef) {
        continue;
      }

      row[getColumnIndex(cellRef)] = readCellValue(attributes, body, sharedStrings);
    }

    return row;
  });
}

function readCellValue(attributes: string, body: string, sharedStrings: string[]): string {
  const type = readXmlAttribute(attributes, 't');

  if (type === 's') {
    const sharedStringIndex = Number(readTagText(body, 'v'));

    return Number.isInteger(sharedStringIndex) ? (sharedStrings[sharedStringIndex] ?? '') : '';
  }

  if (type === 'inlineStr') {
    return readTagText(body, 't');
  }

  return readTagText(body, 'v');
}

function resolveColumnMap(headerRow: ParsedSheetRow): UploadColumnMap {
  return {
    nickname:
      findHeaderColumn(headerRow, ['昵称', '姓名', '学生', '学生昵称', '学生姓名', '名字']) ??
      defaultColumnMap.nickname,
    gender: findHeaderColumn(headerRow, ['性别']) ?? defaultColumnMap.gender,
    grade: findHeaderColumn(headerRow, ['年级']) ?? defaultColumnMap.grade,
    tags: findHeaderColumn(headerRow, ['标签', '表现标签', '评价标签']) ?? defaultColumnMap.tags,
    keywords:
      findHeaderColumn(headerRow, [
        '关键词',
        '核心优缺点',
        '评价内容',
        '细节',
        '个性化细节',
        '备注',
      ]) ?? defaultColumnMap.keywords,
  };
}

function findHeaderColumn(headerRow: ParsedSheetRow, aliases: string[]): number | null {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));

  for (const [columnIndex, value] of Object.entries(headerRow)) {
    if (normalizedAliases.has(normalizeHeader(value))) {
      return Number(columnIndex);
    }
  }

  return null;
}

function toCommentUploadRow(row: ParsedSheetRow, columns: UploadColumnMap): CommentUploadRowInput {
  const nickname = trimToUndefined(row[columns.nickname]);
  const keywords = trimToUndefined(row[columns.keywords]);

  return {
    ...(nickname === undefined ? {} : { nickname }),
    gender: readGender(row[columns.gender]),
    grade: normalizeGrade(row[columns.grade]),
    tags: splitTags(row[columns.tags]),
    ...(keywords === undefined ? {} : { keywords }),
  };
}

function readGender(value: string | undefined): '男' | '女' {
  const normalized = trimToUndefined(value);

  if (normalized === '男' || normalized === '女') {
    return normalized;
  }

  throw new CommentUploadXlsxError('Excel 性别列只支持男或女。');
}

function normalizeGrade(value: string | undefined): string {
  const trimmed = trimToUndefined(value);

  if (!trimmed) {
    return '';
  }

  const numericGrade = trimmed.replace(/\.0+$/, '');

  return gradeNumberMap[numericGrade] ?? gradeChineseNumberMap[trimmed] ?? trimmed;
}

function splitTags(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[,，、;；\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function hasUploadRowContent(row: CommentUploadRowInput): boolean {
  return Boolean(row.nickname || row.keywords || row.grade || row.tags.length > 0);
}

function hasParsedRowContent(row: ParsedSheetRow, columns: UploadColumnMap): boolean {
  return Boolean(
    trimToUndefined(row[columns.nickname]) ||
    trimToUndefined(row[columns.gender]) ||
    trimToUndefined(row[columns.grade]) ||
    trimToUndefined(row[columns.tags]) ||
    trimToUndefined(row[columns.keywords])
  );
}

function readXmlAttribute(attributes: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(attributes);

  return match ? unescapeXml(match[1] ?? '') : null;
}

function readTagText(body: string, tagName: string): string {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`).exec(body);

  return match ? unescapeXml(match[1] ?? '') : '';
}

function getColumnIndex(cellRef: string): number {
  const letters = /^[A-Z]+/i.exec(cellRef)?.[0].toUpperCase() ?? '';
  let columnNumber = 0;

  for (const letter of letters) {
    columnNumber = columnNumber * 26 + letter.charCodeAt(0) - 64;
  }

  return Math.max(columnNumber - 1, 0);
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function trimToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed || undefined;
}

function unescapeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}
