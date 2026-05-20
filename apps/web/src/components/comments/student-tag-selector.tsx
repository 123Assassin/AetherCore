import type { CommentTag } from '@package/shared';

import { commentTagGroups } from './comment-tags.data';

type StudentTagSelectorProps = {
  disabled: boolean;
  onToggle: (tag: CommentTag) => void;
  selectedTags: CommentTag[];
};

function isSelected(values: CommentTag[], tag: CommentTag) {
  return values.includes(tag);
}

export function StudentTagSelector({ disabled, onToggle, selectedTags }: StudentTagSelectorProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 block text-xs font-bold text-slate-700">成长画像标签 (多选)</legend>
      <div className="space-y-3">
        {commentTagGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[10px] font-bold text-slate-400 uppercase">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map((tag) => {
                const selected = isSelected(selectedTags, tag);

                return (
                  <label
                    className={`inline-flex cursor-pointer items-center rounded-lg px-2.5 py-1 text-xs transition-all ${
                      selected
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    key={tag}
                  >
                    <input
                      checked={selected}
                      className="sr-only"
                      disabled={disabled}
                      onChange={() => onToggle(tag)}
                      type="checkbox"
                    />
                    <span>{tag}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
