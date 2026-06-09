export const chatWorkflowRoutes = [
  '/office/comment',
  '/lesson/inspiration',
  '/lesson/teaching',
] as const;

export type ChatWorkflowRoute = (typeof chatWorkflowRoutes)[number];

export const CHAT_WORKFLOW_INTENT_REPLY_TEMPLATE = '需要使用专业教学助手功能吗，点击{按钮}直达。';

type ChatWorkflowIntentRule = {
  route: ChatWorkflowRoute;
  pattern: RegExp;
};

type ChatWorkflowIntentAction = {
  href: ChatWorkflowRoute;
  label: string;
};

const workflowButtonLabels: Record<ChatWorkflowRoute, string> = {
  '/office/comment': '评语助手',
  '/lesson/inspiration': '知识精讲',
  '/lesson/teaching': '题目变身',
};

const intentRules: ChatWorkflowIntentRule[] = [
  {
    route: '/office/comment',
    pattern: /评语|评价语|学生评价|期末评价/,
  },
  {
    route: '/lesson/inspiration',
    pattern: /备课|备一节课|备个课|备课灵感|课程灵感|知识精讲|精讲/,
  },
  {
    route: '/lesson/teaching',
    pattern: /题目变身|题目变式|变式题|改编题|题目改编|出题/,
  },
];

export function resolveChatWorkflowIntent(message: string): ChatWorkflowRoute | null {
  const normalizedMessage = normalizeChatMessage(message);

  if (!normalizedMessage) {
    return null;
  }

  return intentRules.find((rule) => rule.pattern.test(normalizedMessage))?.route ?? null;
}

export function createChatWorkflowIntentAction(route: ChatWorkflowRoute): ChatWorkflowIntentAction {
  return {
    href: route,
    label: workflowButtonLabels[route],
  };
}

export function createChatWorkflowIntentReply(route: ChatWorkflowRoute): string {
  return CHAT_WORKFLOW_INTENT_REPLY_TEMPLATE.replace('{按钮}', workflowButtonLabels[route]);
}

export function isChatWorkflowRoute(route: string): route is ChatWorkflowRoute {
  return (chatWorkflowRoutes as readonly string[]).includes(route);
}

function normalizeChatMessage(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/[\s"'“”‘’.,，。!?！？、:：;；()（）[\]【】<>《》-]+/g, '');
}
