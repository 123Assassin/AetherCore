import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('inspiration form exposes an image upload button beside the topic label', () => {
  const formSource = readSource('../components/inspiration/inspiration-form.tsx');
  const pageSource = readSource('../app/(app)/lesson/inspiration/page.tsx');
  const uploadSource = readSource('uploaded-images.ts');

  assert.match(formSource, /Image as ImageIcon/);
  assert.match(formSource, /accept="image\/\*"/);
  assert.match(uploadSource, /file\?\.type\.startsWith\('image\/'\)/);
  assert.match(uploadSource, /\/api\/uploads\/images/);
  assert.match(formSource, /上传知识点图片/);
  assert.match(formSource, /values\.uploadedImages\.map/);
  assert.match(pageSource, /uploadedImages\.length > 0/);
  assert.match(pageSource, /请先填写主题。/);
});

test('teaching form captures textbook version and image uploads for the prompt', () => {
  const dataSource = readSource('../components/teaching/teaching.data.ts');
  const contextFormSource = readSource('../components/teaching/teaching-context-form.tsx');
  const pageSource = readSource('../app/(app)/lesson/teaching/page.tsx');
  const uploadSource = readSource('uploaded-images.ts');

  assert.match(dataSource, /textbookVersion: string/);
  assert.match(pageSource, /textbookVersion: '人教版'/);
  assert.match(contextFormSource, />教程版本</);
  assert.match(pageSource, /Image as ImageIcon/);
  assert.match(pageSource, /accept="image\/\*"/);
  assert.match(uploadSource, /file\?\.type\.startsWith\('image\/'\)/);
  assert.match(uploadSource, /\/api\/uploads\/images/);
  assert.match(pageSource, /上传置入内容图片/);
  assert.match(pageSource, /formValues\.uploadedImages\.map/);
  assert.match(pageSource, /请先填写原题或知识点。/);
});

test('image upload controls expose a local uploading state', () => {
  const formSource = readSource('../components/inspiration/inspiration-form.tsx');
  const pageSource = readSource('../app/(app)/lesson/teaching/page.tsx');

  assert.match(formSource, /imageUploading/);
  assert.match(formSource, /图片上传中/);
  assert.match(formSource, /上传中\.\.\./);
  assert.match(pageSource, /imageUploading/);
  assert.match(pageSource, /图片上传中/);
  assert.match(pageSource, /上传中\.\.\./);
});
