import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CommentsRepository } from './comments.repository.js';
import { CommentsService, CommentsServiceError } from './comments.service.js';

test('generateSingle rejects invalid gender before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateSingle({
        userId: 'user-1',
        gender: '未知' as never,
        grade: '三年级',
        tags: ['思维活跃'],
      }),
    serviceError('BAD_REQUEST', 'Comment gender must be 男 or 女')
  );
  assert.equal(repository.singleCalls, 0);
});

test('generateSingle rejects empty grade before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateSingle({
        userId: 'user-1',
        gender: '男',
        grade: '   ',
        tags: ['思维活跃'],
      }),
    serviceError('BAD_REQUEST', 'Comment grade is required')
  );
  assert.equal(repository.singleCalls, 0);
});

test('generateSingle rejects invalid tags before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateSingle({
        userId: 'user-1',
        gender: '男',
        grade: '三年级',
        tags: ['不存在的标签'],
      }),
    serviceError('BAD_REQUEST', 'Comment tags contain unsupported values')
  );
  assert.equal(repository.singleCalls, 0);
});

test('generateSingle creates a comment session when sessionId is absent', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  const result = await service.generateSingle({
    userId: 'user-1',
    nickname: '小林',
    gender: '男',
    grade: '三年级',
    tags: ['思维活跃'],
  });

  assert.equal(result.sessionId, 'session-1');
  assert.equal(repository.singleCalls, 1);
  assert.equal(repository.conversations[0]?.category, 'comment');
  assert.equal(repository.messages.length, 2);
  assert.equal(repository.messages[0]?.role, 'user');
  assert.equal(repository.messages[1]?.role, 'assistant');
});

test('generateSingle resolves the mapped comment agent before calling a model API', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  const fetchCalls: Array<{ url: string; body: Record<string, unknown>; headers: Headers }> = [];

  repository.setAgentRuntimeConfig('comment', {
    agent: {
      id: 'agent-comment',
      key: 'comment',
      name: '学生评语智能体',
      temperature: 0.3,
      topP: 0.9,
      maxTokens: 600,
      status: 'enabled',
    },
    engine: {
      id: 'engine-dsv4',
      name: 'DSv4',
      apiBaseUrl: 'https://model.example.test/v1/chat/completions',
      apiKeyCiphertext: Buffer.from('test-api-key', 'utf8').toString('base64'),
      modelName: 'deepseek-chat',
      status: 'enabled',
    },
    prompt: {
      id: 'prompt-comment',
      content: '你只输出学生评语列表。',
    },
    sensitiveWordList: null,
  });

  await withMockFetch(
    async (url, init) => {
      const headers = new Headers(init?.headers);
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      fetchCalls.push({ url: String(url), body, headers });

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '1. 小林课堂思维活跃，能够主动分享想法。\n2. 小林保持认真态度，学习状态稳定。\n3. 小林后续可以继续加强表达训练。',
              },
            },
          ],
          usage: { prompt_tokens: 21, completion_tokens: 33, total_tokens: 54 },
        }),
        { status: 200 }
      );
    },
    async () => {
      const result = await service.generateSingle({
        userId: 'user-1',
        nickname: ' 小林 ',
        gender: '男',
        grade: '三年级',
        tags: ['思维活跃'],
        keywords: ' 课堂发言积极 ',
      });

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0]?.url, 'https://model.example.test/v1/chat/completions');
      assert.equal(fetchCalls[0]?.headers.get('authorization'), 'Bearer test-api-key');
      assert.equal(fetchCalls[0]?.body.model, 'deepseek-chat');
      assert.deepEqual(fetchCalls[0]?.body.messages, [
        { role: 'system', content: '你只输出学生评语列表。' },
        {
          role: 'user',
          content:
            '请为小林生成3条三年级学生评语。性别：男。语气：温和鼓励。表现标签：思维活跃。关注点：课堂发言积极。请每条单独成行。',
        },
      ]);
      assert.deepEqual(result.comments, [
        '小林课堂思维活跃，能够主动分享想法。',
        '小林保持认真态度，学习状态稳定。',
        '小林后续可以继续加强表达训练。',
      ]);
      assert.equal(repository.modelCalls[0]?.agentId, 'agent-comment');
      assert.equal(repository.modelCalls[0]?.engineId, 'engine-dsv4');
      assert.equal(repository.modelCalls[0]?.totalTokens, 54);
    }
  );
});

test('generateSingle resolves the mapped comment agent with grade classification only', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await service.generateSingle({
    userId: 'user-1',
    nickname: '小林',
    gender: '男',
    grade: '三年级',
    subject: '语文',
    tags: ['思维活跃'],
  } as never);

  assert.deepEqual(repository.runtimeConfigLookups.at(-1), {
    grade: '小学',
    key: 'comment',
    subject: null,
  });
});

test('generateSingleStream emits model deltas and persists the final comments', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  const fetchCalls: Array<{ url: string; body: Record<string, unknown>; headers: Headers }> = [];
  const deltas: string[] = [];

  repository.setAgentRuntimeConfig('comment', {
    agent: {
      id: 'agent-comment',
      key: 'comment',
      name: '学生评语智能体',
      temperature: 0.3,
      topP: 0.9,
      maxTokens: 600,
      status: 'enabled',
    },
    engine: {
      id: 'engine-dsv4',
      name: 'DSv4',
      apiBaseUrl: 'https://model.example.test/v1',
      apiKeyCiphertext: Buffer.from('test-api-key', 'utf8').toString('base64'),
      modelName: 'deepseek-chat',
      status: 'enabled',
    },
    prompt: {
      id: 'prompt-comment',
      content: '你只输出学生评语列表。',
    },
    sensitiveWordList: null,
  });

  await withMockFetch(
    async (url, init) => {
      const headers = new Headers(init?.headers);
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      fetchCalls.push({ url: String(url), body, headers });

      return createSseResponse([
        'data: {"choices":[{"delta":{"content":"1. 小林课堂思维活跃"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"，能主动表达。\\n2. 小林作业进步明显。"}}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}\n\n',
        'data: [DONE]\n\n',
      ]);
    },
    async () => {
      const result = await service.generateSingleStream(
        {
          userId: 'user-1',
          nickname: '小林',
          gender: '男',
          grade: '三年级',
          tags: ['思维活跃'],
        },
        (content) => {
          deltas.push(content);
        }
      );

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0]?.url, 'https://model.example.test/v1/chat/completions');
      assert.equal(fetchCalls[0]?.headers.get('authorization'), 'Bearer test-api-key');
      assert.equal(fetchCalls[0]?.body.stream, true);
      assert.deepEqual(deltas, ['1. 小林课堂思维活跃', '，能主动表达。\n2. 小林作业进步明显。']);
      assert.deepEqual(result.comments, ['小林课堂思维活跃，能主动表达。', '小林作业进步明显。']);
      assert.equal(repository.singleCalls, 1);
      assert.equal(repository.modelCalls[0]?.totalTokens, 30);
    }
  );
});

test('generateSingle rejects invalid comment session before returning comments', async () => {
  const repository = new FakeCommentsRepository();
  repository.conversations.push({
    id: 'chat-session',
    userId: 'user-1',
    category: 'chat',
  });
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.generateSingle({
        userId: 'user-1',
        sessionId: 'chat-session',
        gender: '男',
        grade: '三年级',
        tags: ['思维活跃'],
      }),
    serviceError('NOT_FOUND', 'Comment conversation not found')
  );
  assert.equal(repository.messages.length, 0);
});

test('createFromUpload accepts file metadata and returns mock row previews', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  const result = await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    tone: '温和鼓励',
  });

  assert.equal(result.job.fileName, 'comments.xlsx');
  assert.equal(result.job.status, 'pending');
  assert.equal(result.rowPreviews.length, 3);
  assert.deepEqual(result.rowPreviews[0]?.comments, []);
  assert.equal(repository.jobs.length, 1);
  assert.equal(repository.rows.length, 3);
});

test('getBatchTemplate returns the server-side xlsx template', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  const result = await (
    service as unknown as {
      getBatchTemplate: () => Promise<{
        contentBase64: string;
        fileName: string;
        mimeType: string;
      }>;
    }
  ).getBatchTemplate();

  assert.equal(result.fileName, '红笔AI_评语导入模板_v1.xlsx');
  assert.equal(
    result.mimeType,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  assert.equal(Buffer.from(result.contentBase64, 'base64').subarray(0, 2).toString(), 'PK');
});

test('createFromUpload parses uploaded xlsx rows instead of mock previews', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  const result = await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 4096,
    contentBase64: createTestXlsxBase64([
      ['昵称', '性别', '年级', '标签', '关键词'],
      ['小一', '男', '1', '思维活跃', '课堂发言积极'],
      ['小二', '女', '2', '团结协作', '小组合作主动'],
      ['小三', '男', '3', '基础扎实', '作业稳定认真'],
      ['小四', '女', '4', '遵守纪律', '课堂状态稳定'],
      ['小五', '男', '5', '乐于分享', '表达更自信'],
    ]),
  });

  assert.equal(result.rowPreviews.length, 5);
  assert.equal(result.job.totalRows, 5);
  assert.equal(result.rowPreviews[0]?.nickname, '小一');
  assert.equal(result.rowPreviews[0]?.grade, '一年级');
  assert.deepEqual(result.rowPreviews[4]?.tags, ['乐于分享']);
  assert.equal(repository.rows.length, 5);
});

test('createFromUpload applies the batch default grade to every imported row', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  const result = await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 4096,
    contentBase64: createTestXlsxBase64([
      ['昵称', '性别', '年级', '标签', '关键词'],
      ['小一', '男', '1', '思维活跃', '课堂发言积极'],
      ['小二', '女', '2', '团结协作', '小组合作主动'],
    ]),
    defaultGrade: '五年级',
  } as never);

  assert.deepEqual(
    result.rowPreviews.map((row) => row.grade),
    ['五年级', '五年级']
  );
  assert.deepEqual(
    repository.rows.map((row) => row.grade),
    ['五年级', '五年级']
  );
});

test('createFromUpload accepts freeform tags from uploaded xlsx rows', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  const result = await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 4096,
    contentBase64: createTestXlsxBase64([
      ['昵称', '性别', '年级', '标签', '关键词'],
      ['小王', '男', '二年级', '学习认真', '继续保持学习热情'],
      ['小张', '女', '二年级', '体育出众', '多提高文化课热情'],
      ['小陈', '女', '二年级', '进步神速', '继续努力'],
      ['小吴', '男', '二年级', '爱开小差', '改掉坏习惯'],
      ['小高', '男', '二年级', '成绩退步', '改掉坏习惯'],
    ]),
  });

  assert.equal(result.rowPreviews.length, 5);
  assert.equal(result.rowPreviews[0]?.nickname, '小王');
  assert.equal(result.rowPreviews[0]?.grade, '二年级');
  assert.deepEqual(result.rowPreviews[0]?.tags, ['学习认真']);
  assert.deepEqual(result.rowPreviews[4]?.tags, ['成绩退步']);
  assert.equal(repository.rows.length, 5);
});

test('createFromUpload maps required headers by name regardless of column order', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  const result = await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 4096,
    contentBase64: createTestXlsxBase64([
      ['核心优缺点', '表现标签', '性别', '姓名'],
      [
        '学习态度端正，但近期在数学计算上略显粗心，需要加强练习。',
        '思维活跃, 基础扎实, 团结协作',
        '男',
        '张小明',
      ],
      [
        '性格文静，但在课堂发言时不够自信，建议多鼓励其表达。',
        '书写工整, 乐于助人',
        '女',
        '李小华',
      ],
    ]),
    defaultGrade: '三年级',
  } as never);

  assert.equal(result.rowPreviews[0]?.nickname, '张小明');
  assert.equal(result.rowPreviews[0]?.gender, '男');
  assert.equal(result.rowPreviews[0]?.grade, '三年级');
  assert.deepEqual(result.rowPreviews[0]?.tags, ['思维活跃', '基础扎实', '团结协作']);
  assert.equal(
    result.rowPreviews[0]?.keywords,
    '学习态度端正，但近期在数学计算上略显粗心，需要加强练习。'
  );
  assert.equal(result.rowPreviews[1]?.nickname, '李小华');
  assert.deepEqual(result.rowPreviews[1]?.tags, ['书写工整', '乐于助人']);
});

test('createFromUpload rejects xlsx rows without a nickname', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createFromUpload({
        userId: 'user-1',
        fileName: 'comments.xlsx',
        fileSize: 4096,
        contentBase64: createTestXlsxBase64([
          ['昵称', '性别', '年级', '标签', '关键词'],
          ['', '男', '二年级', '学习认真', '继续保持学习热情'],
        ]),
      }),
    serviceError('BAD_REQUEST', 'Excel 昵称/姓名列为必填项。')
  );
  assert.equal(repository.rows.length, 0);
});

test('createFromUpload rejects xlsx without a recognized nickname header', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createFromUpload({
        userId: 'user-1',
        fileName: 'comments.xlsx',
        fileSize: 4096,
        contentBase64: createTestXlsxBase64([
          ['测试字段', '性别', '表现标签', '核心优缺点'],
          [
            '张小明',
            '男',
            '思维活跃, 基础扎实, 团结协作',
            '学习态度端正，但近期在数学计算上略显粗心，需要加强练习。',
          ],
          [
            '李小华',
            '女',
            '书写工整, 乐于助人',
            '性格文静，但在课堂发言时不够自信，建议多鼓励其表达。',
          ],
        ]),
        defaultGrade: '三年级',
      } as never),
    serviceError('BAD_REQUEST', 'Excel 缺少昵称/姓名列。')
  );
  assert.equal(repository.rows.length, 0);
});

test('createFromUpload rejects xlsx rows without performance tags', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createFromUpload({
        userId: 'user-1',
        fileName: 'comments.xlsx',
        fileSize: 4096,
        contentBase64: createTestXlsxBase64([
          ['昵称', '性别', '年级', '标签', '关键词'],
          ['小王', '男', '二年级', '', '继续保持学习热情'],
        ]),
      }),
    serviceError('BAD_REQUEST', 'Excel 表现标签列为必填项。')
  );
  assert.equal(repository.rows.length, 0);
});

test('createFromUpload rejects zero-byte files before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  await assert.rejects(
    () =>
      service.createFromUpload({
        userId: 'user-1',
        fileName: 'comments.xlsx',
        fileSize: 0,
      }),
    serviceError('BAD_REQUEST', 'Comment upload fileSize must be a positive integer')
  );
  assert.equal(repository.jobs.length, 0);
});

test('generateRow updates the row status to success', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });

  const result = await service.generateRow({
    userId: 'user-1',
    jobId: 'job-1',
    rowId: 'row-1',
  });

  assert.equal(result.row.status, 'success');
  assert.equal(repository.rows[0]?.status, 'success');
  assert.equal((repository.rows[0]?.generatedResults as string[] | undefined)?.length, 1);
  assert.deepEqual(result.row.comments, [
    '小林在三年级阶段表现出思维活跃、乐于分享的特点。结合课堂发言更主动，数学进步明显，希望继续保持学习热情。',
  ]);
});

test('generateRow avoids duplicate punctuation when uploaded keywords already end with punctuation', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
    rows: [
      {
        nickname: '张小明',
        gender: '男',
        grade: '一年级',
        tags: ['思维活跃', '基础扎实', '团结协作'],
        keywords: '学习态度端正，但近期在数学计算上略显粗心，需要加强练习。',
      },
    ],
  });

  const result = await service.generateRow({
    userId: 'user-1',
    jobId: 'job-1',
    rowId: 'row-1',
  });

  assert.deepEqual(result.row.comments, [
    '张小明在一年级阶段表现出思维活跃、基础扎实、团结协作的特点。结合学习态度端正，但近期在数学计算上略显粗心，需要加强练习。希望继续保持学习热情。',
  ]);
  assert.doesNotMatch(result.row.comments[0] ?? '', /。，/);
});

test('generateRow can regenerate a successful row and replace its comment', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });
  const row = repository.rows.find((item) => item.id === 'row-1');

  assert.ok(row);
  row.status = 'success';
  row.generatedResults = ['旧评语'];
  await service.generateRow({
    userId: 'user-1',
    jobId: 'job-1',
    rowId: 'row-1',
  });

  assert.notDeepEqual(row.generatedResults, ['旧评语']);
  assert.equal(row.generatedResults?.length, 1);
});

test('generateRow keeps model markdown in saved batch comments for frontend sanitization', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());

  repository.setAgentRuntimeConfig('comment', {
    agent: {
      id: 'agent-comment',
      key: 'comment',
      name: '学生评语智能体',
      temperature: 0.3,
      topP: 0.9,
      maxTokens: 600,
      status: 'enabled',
    },
    engine: {
      id: 'engine-dsv4',
      name: 'DSv4',
      apiBaseUrl: 'https://model.example.test/v1/chat/completions',
      apiKeyCiphertext: Buffer.from('test-api-key', 'utf8').toString('base64'),
      modelName: 'deepseek-chat',
      status: 'enabled',
    },
    prompt: {
      id: 'prompt-comment',
      content: '你只输出学生评语列表。',
    },
    sensitiveWordList: null,
  });
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });

  await withMockFetch(
    async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '```markdown\n1. **小林课堂表达更主动**，能够结合问题清晰说明自己的想法。\n2. 小林学习状态稳定。\n```',
              },
            },
          ],
        }),
        { status: 200 }
      ),
    async () => {
      const result = await service.generateRow({
        userId: 'user-1',
        jobId: 'job-1',
        rowId: 'row-1',
      });

      assert.deepEqual(result.row.comments, [
        '**小林课堂表达更主动**，能够结合问题清晰说明自己的想法。',
      ]);
      assert.deepEqual(repository.rows[0]?.generatedResults, [
        '**小林课堂表达更主动**，能够结合问题清晰说明自己的想法。',
      ]);
    }
  );
});

test('generateDemoRow calls the model and returns one comment without persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = [];

  repository.setAgentRuntimeConfig('comment', {
    agent: {
      id: 'agent-comment',
      key: 'comment',
      name: '学生评语智能体',
      temperature: 0.3,
      topP: 0.9,
      maxTokens: 600,
      status: 'enabled',
    },
    engine: {
      id: 'engine-dsv4',
      name: 'DSv4',
      apiBaseUrl: 'https://model.example.test/v1/chat/completions',
      apiKeyCiphertext: Buffer.from('test-api-key', 'utf8').toString('base64'),
      modelName: 'deepseek-chat',
      status: 'enabled',
    },
    prompt: {
      id: 'prompt-comment',
      content: '你只输出学生评语列表。',
    },
    sensitiveWordList: null,
  });

  await withMockFetch(
    async (url, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      fetchCalls.push({ url: String(url), body });

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '1. 小林课堂表达更主动，能够结合问题清晰说明自己的想法。\n2. 小林学习状态稳定。',
              },
            },
          ],
        }),
        { status: 200 }
      );
    },
    async () => {
      const result = await (
        service as unknown as {
          generateDemoRow: (input: {
            gender: '男';
            grade: string;
            keywords?: string;
            nickname?: string;
            tags: string[];
            userId: string;
          }) => Promise<{ comment: string }>;
        }
      ).generateDemoRow({
        userId: 'user-1',
        nickname: '小林',
        gender: '男',
        grade: '一年级',
        tags: ['思维活跃'],
        keywords: '课堂表达主动',
      });

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0]?.url, 'https://model.example.test/v1/chat/completions');
      assert.equal(result.comment, '小林课堂表达更主动，能够结合问题清晰说明自己的想法。');
      assert.equal(repository.singleCalls, 0);
      assert.equal(repository.jobs.length, 0);
      assert.equal(repository.rows.length, 0);
      assert.equal(repository.messages.length, 0);
      assert.equal(repository.modelCalls.length, 0);
    }
  );
});

test('generateAll returns completed aggregate after multiple row generations', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });

  const result = await service.generateAll({
    userId: 'user-1',
    jobId: 'job-1',
  });

  assert.equal(result.job.status, 'completed');
  assert.equal(result.job.successRows, 3);
  assert.equal(result.job.failedRows, 0);
  assert.equal(result.rows.length, 3);
  assert.equal(
    result.rows.every((row) => row.status === 'success'),
    true
  );
});

test('generateAll skips successful rows while generating pending and error rows', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });
  const firstRow = repository.rows.find((item) => item.id === 'row-1');
  const secondRow = repository.rows.find((item) => item.id === 'row-2');

  assert.ok(firstRow);
  assert.ok(secondRow);
  firstRow.status = 'success';
  firstRow.generatedResults = ['保留已编辑评语'];
  secondRow.status = 'error';
  secondRow.errorMessage = '上一轮失败';

  const result = await service.generateAll({
    userId: 'user-1',
    jobId: 'job-1',
  });

  assert.deepEqual(firstRow.generatedResults, ['保留已编辑评语']);
  assert.equal(result.rows.find((row) => row.id === 'row-2')?.comments.length, 1);
  assert.equal(result.rows.find((row) => row.id === 'row-3')?.comments.length, 1);
});

test('updateRowComment saves a manually edited single comment', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });

  const result = await (
    service as unknown as {
      updateRowComment: (input: {
        userId: string;
        jobId: string;
        rowId: string;
        comment: string;
      }) => Promise<{ row: { comments: string[] } }>;
    }
  ).updateRowComment({
    userId: 'user-1',
    jobId: 'job-1',
    rowId: 'row-1',
    comment: '  手动编辑后的评语  ',
  });

  assert.deepEqual(result.row.comments, ['手动编辑后的评语']);
  assert.deepEqual(repository.rows[0]?.generatedResults, ['手动编辑后的评语']);
});

test('updateRowComment rejects empty manual comments before persistence', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });

  await assert.rejects(
    () =>
      (
        service as unknown as {
          updateRowComment: (input: {
            userId: string;
            jobId: string;
            rowId: string;
            comment: string;
          }) => Promise<unknown>;
        }
      ).updateRowComment({
        userId: 'user-1',
        jobId: 'job-1',
        rowId: 'row-1',
        comment: '   ',
      }),
    serviceError('BAD_REQUEST', 'Comment row comment is required')
  );
  assert.equal(repository.manualUpdateCalls, 0);
});

test('exportBatch returns an Excel base64 payload', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });
  await service.generateRow({
    userId: 'user-1',
    jobId: 'job-1',
    rowId: 'row-1',
  });

  const result = await service.exportBatch({
    userId: 'user-1',
    jobId: 'job-1',
  });

  assert.equal(result.fileName.endsWith('.xlsx'), true);
  assert.equal(
    result.mimeType,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  assert.equal(typeof result.contentBase64, 'string');
  assert.equal(Buffer.from(result.contentBase64, 'base64').subarray(0, 2).toString(), 'PK');
});

test('exportBatch writes one plain-text comment column', async () => {
  const repository = new FakeCommentsRepository();
  const service = new CommentsService(repository.asRepository());
  await service.createFromUpload({
    userId: 'user-1',
    fileName: 'comments.xlsx',
    fileSize: 2048,
  });
  await service.generateRow({
    userId: 'user-1',
    jobId: 'job-1',
    rowId: 'row-1',
  });
  const row = repository.rows.find((item) => item.id === 'row-1');

  assert.ok(row);
  row.generatedResults = [
    '```markdown\n**第一条评语**\n- 课堂表现稳定\n```',
    '```markdown\n第二条评语\n```',
    '`第三条评语`',
  ];

  const result = await service.exportBatch({
    userId: 'user-1',
    jobId: 'job-1',
  });
  const workbook = Buffer.from(result.contentBase64, 'base64').toString('utf8');

  assert.match(workbook, /评语/);
  assert.doesNotMatch(workbook, /评语1/);
  assert.doesNotMatch(workbook, /评语2/);
  assert.doesNotMatch(workbook, /评语3/);
  assert.match(workbook, /第一条评语\s*课堂表现稳定/);
  assert.doesNotMatch(workbook, /第二条评语/);
  assert.doesNotMatch(workbook, /第三条评语/);
  assert.doesNotMatch(workbook, /\*\*|```|`|- 课堂表现稳定/);
});

type JobRow = {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  tone: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: Date;
  updatedAt: Date;
};

type BatchRow = {
  id: string;
  jobId: string;
  rowIndex: number;
  nickname: string | null;
  gender: '男' | '女';
  grade: string;
  tags: string[];
  keywords: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  generatedResults: string[] | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ConversationRow = {
  id: string;
  userId: string;
  category: 'chat' | 'inspiration' | 'comment' | 'teaching';
};

type MessageRow = {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
};

type AgentRuntimeConfig = {
  agent: {
    id: string;
    key: 'comment';
    name: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    status: 'enabled' | 'disabled';
  };
  engine: {
    id: string;
    name: string;
    apiBaseUrl: string;
    apiKeyCiphertext: string;
    modelName: string | null;
    status: 'enabled' | 'disabled';
  };
  prompt: {
    id: string;
    content: string;
  } | null;
  sensitiveWordList: {
    id: string;
    words: string[];
  } | null;
};

type ModelCallInput = {
  agentId?: string | null;
  engineId?: string | null;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costAmount: number;
  currency: string;
};

class FakeCommentsRepository {
  singleCalls = 0;
  readonly jobs: JobRow[] = [];
  readonly rows: BatchRow[] = [];
  readonly conversations: ConversationRow[] = [];
  readonly messages: MessageRow[] = [];
  readonly runtimeConfigs = new Map<'comment', AgentRuntimeConfig>();
  readonly runtimeConfigLookups: Array<{
    key: 'comment';
    grade: string | null;
    subject: string | null;
  }> = [];
  readonly modelCalls: ModelCallInput[] = [];
  manualUpdateCalls = 0;

  asRepository(): CommentsRepository {
    return this as unknown as CommentsRepository;
  }

  async saveSingleGeneration(input: {
    userId: string;
    sessionId?: string;
    nickname?: string | null;
    gender: '男' | '女';
    grade: string;
    tags: string[];
    keywords?: string | null;
    tone: string;
    comments: string[];
    modelCall?: ModelCallInput;
  }): Promise<{ sessionId: string } | null> {
    this.singleCalls += 1;

    let conversation = input.sessionId
      ? this.conversations.find(
          (item) =>
            item.id === input.sessionId &&
            item.userId === input.userId &&
            item.category === 'comment'
        )
      : undefined;

    if (input.sessionId && !conversation) {
      return null;
    }

    if (!conversation) {
      conversation = {
        id: `session-${this.conversations.length + 1}`,
        userId: input.userId,
        category: 'comment',
      };
      this.conversations.push(conversation);
    }

    this.messages.push(
      {
        conversationId: conversation.id,
        role: 'user',
        content: input.nickname ? `${input.nickname}评语生成` : '评语生成',
      },
      {
        conversationId: conversation.id,
        role: 'assistant',
        content: input.comments.join('\n\n'),
      }
    );
    if (input.modelCall) {
      this.modelCalls.push(input.modelCall);
    }

    return { sessionId: conversation.id };
  }

  setAgentRuntimeConfig(key: 'comment', config: AgentRuntimeConfig): void {
    this.runtimeConfigs.set(key, config);
  }

  async findAgentRuntimeConfigByKey(
    key: 'comment',
    classification?: { grade?: string | null; subject?: string | null }
  ): Promise<AgentRuntimeConfig | null> {
    this.runtimeConfigLookups.push({
      grade: classification?.grade ?? null,
      key,
      subject: classification?.subject ?? null,
    });

    return this.runtimeConfigs.get(key) ?? null;
  }

  async createBatch(input: {
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType?: string | null;
    tone: string;
    rows: Array<{
      rowIndex: number;
      nickname?: string | null;
      gender: '男' | '女';
      grade: string;
      tags: string[];
      keywords?: string | null;
    }>;
  }): Promise<{ job: JobRow; rows: BatchRow[] }> {
    const now = new Date('2026-05-20T00:00:00.000Z');
    const job: JobRow = {
      id: 'job-1',
      userId: input.userId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType ?? null,
      tone: input.tone,
      status: 'pending',
      totalRows: input.rows.length,
      successRows: 0,
      failedRows: 0,
      createdAt: now,
      updatedAt: now,
    };
    const rows = input.rows.map((row, index) => ({
      id: `row-${index + 1}`,
      jobId: job.id,
      rowIndex: row.rowIndex,
      nickname: row.nickname ?? null,
      gender: row.gender,
      grade: row.grade,
      tags: row.tags,
      keywords: row.keywords ?? null,
      status: 'pending' as const,
      generatedResults: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    }));

    this.jobs.push(job);
    this.rows.push(...rows);

    return { job, rows };
  }

  async findBatchForUser(
    userId: string,
    jobId: string
  ): Promise<{ job: JobRow; rows: BatchRow[] } | null> {
    const job = this.jobs.find((item) => item.id === jobId && item.userId === userId);

    if (!job) {
      return null;
    }

    return {
      job,
      rows: this.rows.filter((row) => row.jobId === job.id),
    };
  }

  async updateRowGenerated(input: {
    jobId: string;
    rowId: string;
    generatedResults: string[];
    modelCall?: ModelCallInput;
  }): Promise<{ job: JobRow; row: BatchRow } | null> {
    const job = this.jobs.find((item) => item.id === input.jobId);
    const row = this.rows.find((item) => item.id === input.rowId && item.jobId === input.jobId);

    if (!job || !row) {
      return null;
    }

    row.status = 'success';
    row.generatedResults = input.generatedResults;
    row.updatedAt = new Date('2026-05-20T00:01:00.000Z');
    job.successRows = this.rows.filter(
      (item) => item.jobId === job.id && item.status === 'success'
    ).length;
    job.status = job.successRows === job.totalRows ? 'completed' : 'running';
    job.updatedAt = row.updatedAt;
    if (input.modelCall) {
      this.modelCalls.push(input.modelCall);
    }

    return { job, row };
  }

  async updateRowComment(input: {
    jobId: string;
    rowId: string;
    comment: string;
  }): Promise<{ job: JobRow; row: BatchRow } | null> {
    this.manualUpdateCalls += 1;

    const job = this.jobs.find((item) => item.id === input.jobId);
    const row = this.rows.find((item) => item.id === input.rowId && item.jobId === input.jobId);

    if (!job || !row) {
      return null;
    }

    row.status = 'success';
    row.generatedResults = [input.comment];
    row.errorMessage = null;
    row.updatedAt = new Date('2026-05-20T00:02:00.000Z');
    job.successRows = this.rows.filter(
      (item) => item.jobId === job.id && item.status === 'success'
    ).length;
    job.status = job.successRows === job.totalRows ? 'completed' : 'running';
    job.updatedAt = row.updatedAt;

    return { job, row };
  }
}

function serviceError(code: string, message: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof CommentsServiceError && error.code === code && error.message === message;
}

async function withMockFetch(
  handler: (
    url: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => Promise<Response>,
  callback: () => Promise<void>
): Promise<void> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = handler as typeof fetch;

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function createSseResponse(events: string[]): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(event));
        }

        controller.close();
      },
    }),
    {
      headers: {
        'content-type': 'text/event-stream',
      },
      status: 200,
    }
  );
}

function createTestXlsxBase64(rows: string[][]): string {
  return createStoredZipBase64([
    {
      path: 'xl/worksheets/sheet1.xml',
      content: createTestWorksheetXml(rows),
    },
  ]);
}

function createTestWorksheetXml(rows: string[][]): string {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((value, columnIndex) => {
          const cellRef = `${String.fromCharCode(65 + columnIndex)}${rowNumber}`;

          return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join('');

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${sheetRows}</sheetData>` +
    '</worksheet>'
  );
}

function createStoredZipBase64(entries: Array<{ path: string; content: string }>): string {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.path, 'utf8');
    const content = Buffer.from(entry.content, 'utf8');
    const localHeader = Buffer.alloc(30);
    const centralHeader = Buffer.alloc(46);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(Buffer.concat([localHeader, fileName, content]));
    centralParts.push(Buffer.concat([centralHeader, fileName]));
    offset += localHeader.length + fileName.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);

  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDirectory, endRecord]).toString('base64');
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
