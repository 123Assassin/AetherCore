'use client';

type SuggestionChipsProps = {
  disabled: boolean;
  onSelect: (suggestion: string) => void;
  suggestions: string[];
};

export function SuggestionChips({ disabled, onSelect, suggestions }: SuggestionChipsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section aria-label="建议问题" className="suggestion-chips">
      {suggestions.map((suggestion) => (
        <button
          aria-label={`发送建议：${suggestion}`}
          className="suggestion-chips__button"
          disabled={disabled}
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          type="button"
        >
          {suggestion}
        </button>
      ))}
    </section>
  );
}
