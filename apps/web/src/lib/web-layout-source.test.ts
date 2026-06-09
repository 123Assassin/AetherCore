import * as assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('inspiration page uses the same full-width two-column shell as teaching page', () => {
  const source = readSource('../app/(app)/lesson/inspiration/page.tsx');

  assert.match(
    source,
    /className="flex h-full min-h-0 flex-col bg-white p-4 md:p-6"/,
    'inspiration page should not use a centered max-width wrapper'
  );
  assert.doesNotMatch(source, /max-w-\[1400px\]/);
});

test('inspiration form sits inside a dynamic-height left input column', () => {
  const source = readSource('../app/(app)/lesson/inspiration/page.tsx');

  assert.match(source, /<section\s+aria-label="知识精讲输入"/);
  assert.match(
    source,
    /custom-scrollbar h-full w-full shrink-0 overflow-y-auto pr-0 lg:w-\[420px\] lg:pr-2/
  );
});

test('single comment form uses block-level labels as fieldset siblings', () => {
  const source = readSource('../components/comments/single-comment-form.tsx');

  assert.match(source, /<label className="block">\s*<span[^>]*>评价语气<\/span>/);
  assert.match(source, /<label className="block">\s*<span[^>]*>个性化细节补充<\/span>/);
});

test('office layout does not render an empty subnav border container', () => {
  const source = readSource('../app/(app)/office/layout.tsx');

  assert.doesNotMatch(source, /OfficeSubNav/);
  assert.doesNotMatch(source, /border-b border-slate-100/);
  assert.doesNotMatch(source, /office-sub-nav/);
});

test('teaching context form shows grade before subject with concise labels', () => {
  const source = readSource('../components/teaching/teaching-context-form.tsx');
  const gradeIndex = source.indexOf('>年级<');
  const subjectIndex = source.indexOf('>学科<');

  assert.ok(gradeIndex >= 0, 'teaching context form should label stage as 年级');
  assert.ok(subjectIndex >= 0, 'teaching context form should label subject as 学科');
  assert.ok(gradeIndex < subjectIndex, '年级 should appear before 学科');
  assert.doesNotMatch(source, /学科选择|学段选择/);
});

test('inspiration form labels the grade selector as 年级', () => {
  const source = readSource('../components/inspiration/inspiration-form.tsx');

  assert.match(source, />🎯 年级</);
  assert.doesNotMatch(source, /授课对象/);
});

test('teaching context form derives subject options from the selected grade', () => {
  const source = readSource('../components/teaching/teaching-context-form.tsx');

  assert.match(source, /getTeachingSubjectOptions\(values\.stage\)/);
  assert.match(source, /getDefaultTeachingSubjectForStage\(target\.value\)/);
  assert.match(source, /onInput=\{handleStageChange\}/);
});

test('inspiration form derives subject options from the selected grade', () => {
  const source = readSource('../components/inspiration/inspiration-form.tsx');

  assert.match(source, /getInspirationSubjectOptions\(values\.grade\)/);
  assert.match(source, /getDefaultInspirationSubjectForGrade\(target\.value\)/);
  assert.match(source, /onInput=\{handleGradeChange\}/);
});

test('teaching page defaults subject to the first subject option', () => {
  const source = readSource('../app/(app)/lesson/teaching/page.tsx');

  assert.match(source, /stage: '小学'/);
  assert.match(source, /subject: getDefaultTeachingSubjectForStage\('小学'\)/);
  assert.doesNotMatch(source, /subject: '数学'/);
});

test('single comment form only asks for grade, not subject', () => {
  const formSource = readSource('../components/comments/single-comment-form.tsx');
  const pageSource = readSource('../app/(app)/office/comment/page.tsx');

  assert.doesNotMatch(formSource, /agentSubjectOptions/);
  assert.doesNotMatch(formSource, /aria-label="学科"/);
  assert.doesNotMatch(formSource, /<span[^>]*>学科<\/span>/);
  assert.doesNotMatch(pageSource, /subject: '语文'/);
  assert.doesNotMatch(pageSource, /values\.subject/);
});

test('single comment grade defaults to elementary without an empty placeholder', () => {
  const formSource = readSource('../components/comments/single-comment-form.tsx');
  const pageSource = readSource('../app/(app)/office/comment/page.tsx');
  const gradeSelectStart = formSource.indexOf('aria-label="年级"');
  const subjectSelectStart = formSource.indexOf('aria-label="学科"');
  const gradeSelectSource = formSource.slice(
    gradeSelectStart,
    subjectSelectStart === -1 ? undefined : subjectSelectStart
  );

  assert.match(pageSource, /grade: '小学'/);
  assert.doesNotMatch(gradeSelectSource, /<option value="">请选择<\/option>/);
});

test('single comment panels use clear solid borders without dashed ring stacking', () => {
  const formSource = readSource('../components/comments/single-comment-form.tsx');
  const resultSource = readSource('../components/comments/comment-result-list.tsx');

  assert.match(
    formSource,
    /className="h-fit space-y-6 rounded-2xl border border-slate-200 bg-white/
  );
  assert.match(resultSource, /rounded-2xl border border-slate-200 bg-white/);
  assert.doesNotMatch(resultSource, /border-dashed/);
  assert.doesNotMatch(resultSource, /ring-slate-200\/60/);
});

test('batch comment import panels use clear solid borders without dashed ring stacking', () => {
  const pageSource = readSource('../app/(app)/office/comment/page.tsx');
  const dropzoneSource = readSource('../components/comments/excel-upload-dropzone.tsx');

  assert.match(
    pageSource,
    /className="flex min-h-\[600px\] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/
  );
  assert.match(dropzoneSource, /rounded-\[2\.5rem\] border border-slate-200/);
  assert.doesNotMatch(dropzoneSource, /border-dashed/);
  assert.doesNotMatch(pageSource, /rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/);
});

test('batch import guide aligns step markers with text baselines', () => {
  const source = readSource('../components/comments/batch-import-guide.tsx');

  assert.match(source, /<li className="flex items-baseline gap-3">/);
  assert.doesNotMatch(source, /<li className="flex gap-3">/);
});

test('sidebar presents the chat route as the workbench home', () => {
  const source = readSource('../components/layout/app-sidebar.tsx');

  assert.match(source, /import \{ BookOpen, Box, Heart, LogIn, LogOut, PenTool \}/);
  assert.match(source, /\{ id: 'chat', label: '工作台首页', href: '\/', icon: Box \}/);
  assert.doesNotMatch(source, /label: 'AI 助手'/);
});

test('root route renders the dashboard toolkit instead of the AI conversation module', () => {
  const source = readSource('../app/(app)/page.tsx');

  assert.match(source, /Smart Toolkit/);
  assert.match(source, /专注教研，/);
  assert.match(source, /更懂老师/);
  assert.match(source, /知识精讲/);
  assert.match(source, /题目变身/);
  assert.match(source, /评语助手/);
  assert.match(source, /互动实验/);
  assert.match(source, /router\.push\(feature\.href\)/);
  assert.match(source, /href: '\/lesson\/inspiration'/);
  assert.match(source, /href: '\/lesson\/teaching'/);
  assert.match(source, /href: '\/office\/comment'/);
  assert.match(source, /href: '\/lesson\/simulation'/);
  assert.doesNotMatch(source, /AiSender|ChatMessageList|sendAiChatStream|useChatHistory/);
});

test('legacy chat route is not exposed', () => {
  const routePath = new URL('../app/(app)/chat/page.tsx', import.meta.url);

  assert.equal(existsSync(routePath), false);
});

test('dashboard route does not expose history or new conversation controls', () => {
  const shellSource = readSource('../components/layout/app-shell.tsx');
  const headerSource = readSource('../components/layout/app-header.tsx');

  assert.match(shellSource, /const historyEnabled = route\.activeCategory !== 'chat';/);
  assert.match(shellSource, /\{historyEnabled \? \(\s*<HistorySidebar/);
  assert.match(shellSource, /showHistoryToggle=\{historyEnabled\}/);
  assert.match(headerSource, /showHistoryToggle\?: boolean/);
  assert.match(headerSource, /\{showHistoryToggle \? \(\s*<button/);
});

test('web-layout-source test resolves files from this directory', () => {
  assert.ok(fileURLToPath(import.meta.url).endsWith('web-layout-source.test.ts'));
});
