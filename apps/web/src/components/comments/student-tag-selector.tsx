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
    <fieldset className="student-tag-selector">
      <legend>表现标签</legend>
      <div className="student-tag-selector__groups">
        {commentTagGroups.map((group) => (
          <div className="student-tag-selector__group" key={group.label}>
            <p>{group.label}</p>
            <div className="student-tag-selector__options">
              {group.tags.map((tag) => (
                <label className="student-tag-option" key={tag}>
                  <input
                    checked={isSelected(selectedTags, tag)}
                    disabled={disabled}
                    onChange={() => onToggle(tag)}
                    type="checkbox"
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
