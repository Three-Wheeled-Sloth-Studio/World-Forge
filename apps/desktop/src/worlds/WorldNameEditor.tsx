import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import './worldLibraryUx.css';

type WorldNameElement = 'h2' | 'h3' | 'strong' | 'span';

export type WorldNameEditorProps = {
  value: string;
  onSave: (name: string) => void | Promise<void>;
  as?: WorldNameElement;
  className?: string;
  disabled?: boolean;
};

export function WorldNameEditor({
  value,
  onSave,
  as = 'strong',
  className = '',
  disabled = false,
}: WorldNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const ValueTag = as;

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const cancel = () => {
    setDraft(value);
    setError('');
    setEditing(false);
  };

  const commit = async (event?: FormEvent) => {
    event?.preventDefault();
    const name = draft.trim();
    if (!name) {
      setError('World name is required.');
      return;
    }
    if (name === value) {
      cancel();
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave(name);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'World name could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`inline-world-name-editor ${editing ? 'editing' : ''} ${className}`.trim()}>
      {editing ? (
        <form className="inline-world-name-form" onSubmit={commit}>
          <label className="sr-only" htmlFor={`world-name-${value.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>World name</label>
          <input
            ref={inputRef}
            id={`world-name-${value.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
            value={draft}
            maxLength={120}
            autoComplete="off"
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                cancel();
              }
            }}
          />
          <button className="icon-button inline-world-name-confirm" type="submit" title="Save world name" aria-label="Save world name" disabled={saving}>
            <Check size={15} />
          </button>
          <button className="icon-button inline-world-name-cancel" type="button" title="Cancel world name edit" aria-label="Cancel world name edit" disabled={saving} onClick={cancel}>
            <X size={15} />
          </button>
        </form>
      ) : (
        <>
          <ValueTag className="inline-world-name-value">{value}</ValueTag>
          <button
            className="icon-button inline-world-name-edit"
            type="button"
            title="Edit world name"
            aria-label={`Edit world name ${value}`}
            disabled={disabled}
            onClick={() => {
              setDraft(value);
              setError('');
              setEditing(true);
            }}
          >
            <Pencil size={14} />
          </button>
        </>
      )}
      {error ? <span className="inline-world-name-error" role="alert">{error}</span> : null}
    </div>
  );
}
