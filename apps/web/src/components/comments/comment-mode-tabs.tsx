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
  { label: '单人评语精编', mode: 'single' },
  { disabled: true, label: '批量表格导入', mode: 'batch' },
];

export function CommentModeTabs({
  activeMode,
  availableModes = defaultCommentModes,
  onModeChange,
}: CommentModeTabsProps) {
  return (
    <div aria-label="评语模式" className="flex shrink-0 gap-4 border-b border-slate-200">
      {availableModes.map((modeConfig) => {
        const isActive = activeMode === modeConfig.mode;

        return (
          <button
            aria-pressed={isActive}
            className={`relative px-2 pb-3 text-sm font-bold transition-colors ${
              isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
            } ${modeConfig.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={modeConfig.disabled}
            key={modeConfig.mode}
            onClick={() => onModeChange?.(modeConfig.mode)}
            type="button"
          >
            {modeConfig.label}
            {isActive ? (
              <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-emerald-600" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
