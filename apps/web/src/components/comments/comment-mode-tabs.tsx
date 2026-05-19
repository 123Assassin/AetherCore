'use client';

type CommentMode = 'single' | 'batch';

type CommentModeConfig = {
  disabled?: boolean;
  label: string;
  mode: CommentMode;
};

type CommentModeTabsProps = {
  activeMode: CommentMode;
  availableModes?: CommentModeConfig[];
  onModeChange?: (mode: CommentMode) => void;
};

const defaultCommentModes: CommentModeConfig[] = [
  { label: '单人生成', mode: 'single' },
  { disabled: true, label: '批量生成', mode: 'batch' },
];

export function CommentModeTabs({
  activeMode,
  availableModes = defaultCommentModes,
  onModeChange,
}: CommentModeTabsProps) {
  return (
    <div aria-label="评语模式" className="comment-mode-tabs">
      {availableModes.map((modeConfig) => {
        const isActive = activeMode === modeConfig.mode;

        return (
          <button
            aria-pressed={isActive}
            className={
              isActive
                ? 'comment-mode-tabs__tab comment-mode-tabs__tab--active'
                : modeConfig.disabled
                  ? 'comment-mode-tabs__tab comment-mode-tabs__tab--disabled'
                  : 'comment-mode-tabs__tab'
            }
            disabled={modeConfig.disabled}
            key={modeConfig.mode}
            onClick={() => onModeChange?.(modeConfig.mode)}
            type="button"
          >
            {modeConfig.label}
          </button>
        );
      })}
    </div>
  );
}
