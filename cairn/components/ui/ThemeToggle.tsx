'use client';

import { useEffect, useState } from 'react';

type Choice = 'system' | 'light' | 'dark';

/**
 * Both of them will use this at night, so the theme is a real setting rather
 * than whatever the operating system happens to say.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>('system');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cairn.theme') as Choice | null;
      if (stored) setChoice(stored);
    } catch {
      // Private windows and blocked site data both land here. The system theme
      // is a correct answer, so there is nothing to recover from.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    try {
      localStorage.setItem('cairn.theme', choice);
    } catch {
      // Nothing depends on this persisting.
    }
  }, [choice]);

  const next: Record<Choice, Choice> = { system: 'light', light: 'dark', dark: 'system' };
  const label: Record<Choice, string> = { system: 'System', light: 'Light', dark: 'Dark' };

  return (
    <button
      type="button"
      onClick={() => setChoice(next[choice])}
      className="rounded-md border border-rule px-2.5 py-1 text-[.72rem] text-ink-muted
                 hover:border-rule-strong"
    >
      {label[choice]}
    </button>
  );
}
