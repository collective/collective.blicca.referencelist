/**
 * `referencelist_references` — the picked items, in order, with the host's
 * own content picker behind an Add disclosure.
 *
 * The picker is looked up as `config.getWidget('object_browser')`, never
 * imported: Blicca's is a `pat-contentbrowser` island, Aurora's needs the
 * edit route, and each works in its own host. It is mounted in `multiple`
 * mode and every selection it reports is MERGED into the list (both hosts
 * report the whole current selection, Blicca on every click), so picking
 * several items in a row appends each once. Removing and reordering are
 * this widget's own controls; the picker only ever adds.
 *
 * What is stored per item is `referenceFrom(brain)`: the `@id` (rewritten
 * to a resolveuid reference on save), the UID, the type and a snapshot the
 * canvas shows until the server has resolved the reference. Nothing here
 * is screened or resolved; the server derives the live summaries.
 */
import { useCallback, useId, useRef, useState, type ComponentType } from 'react';
import config from '@plone/registry';

import {
  referenceFrom,
  referenceKey,
  storedReferences,
  titleOf,
  type Reference,
} from '../referencelist/data';
import { FieldShell, buttonClass, type FieldShellProps } from './field-shell';

export type ReferencesWidgetProps = FieldShellProps & {
  name?: string;
  defaultValue?: unknown;
  value?: unknown;
  /** Forwarded to the host's picker untouched (`pattern_options.selectableTypes`). */
  widgetOptions?: Record<string, unknown>;
  onChange?: (value: Reference[]) => void;
};

// An explicit text colour: the host's sidebar inherits white, and every
// control there names its own.
const rowClass =
  'flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1 text-sm text-quanta-iron';
const iconButtonClass = 'rounded px-1 text-xs text-quanta-pigeon hover:text-quanta-iron disabled:opacity-40';

/** Append the picked brains the list does not hold yet. */
export function mergePicked(current: Reference[], picked: unknown): Reference[] {
  if (!Array.isArray(picked)) return current;
  const known = new Set<string>();
  for (const reference of current) {
    known.add(referenceKey(reference));
    known.add(reference['@id']);
  }
  const added: Reference[] = [];
  for (const brain of picked) {
    const reference = referenceFrom((brain ?? {}) as Record<string, unknown>);
    if (!reference) continue;
    if (known.has(referenceKey(reference)) || known.has(reference['@id'])) continue;
    known.add(referenceKey(reference));
    known.add(reference['@id']);
    added.push(reference);
  }
  // The same array back when nothing was new, so a picker that reports the
  // whole selection on every click never triggers a change.
  return added.length ? [...current, ...added] : current;
}

export function moveReference(current: Reference[], from: number, to: number): Reference[] {
  if (to < 0 || to >= current.length || from === to) return current;
  const next = [...current];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function ReferencesWidget(props: ReferencesWidgetProps) {
  const { label, description, className, onChange } = props;
  const incoming = storedReferences(props.value ?? props.defaultValue);
  const incomingKey = JSON.stringify(incoming);
  // The list is the widget's own state, so a host that does not round-trip
  // a change still shows the edit; it is re-seeded only when the host hands
  // a DIFFERENT stored value than it did last time (a reload, an undo).
  const [references, setReferences] = useState(incoming);
  const lastIncoming = useRef(incomingKey);
  if (lastIncoming.current !== incomingKey) {
    lastIncoming.current = incomingKey;
    setReferences(incoming);
  }
  const [browsing, setBrowsing] = useState(false);
  const pickerId = useId();

  const commit = useCallback(
    (next: Reference[]) => {
      setReferences(next);
      onChange?.(next);
    },
    [onChange],
  );

  const Picker = config.getWidget('object_browser') as ComponentType<any> | undefined;

  const handlePicked = useCallback(
    (selected: unknown) => {
      const next = mergePicked(references, selected);
      if (next !== references) commit(next);
    },
    [commit, references],
  );

  return (
    <FieldShell
      blockClass="referencelist-references-widget"
      label={label}
      description={description}
      className={className}
      render={(controlId) => (
        <>
          <ol id={controlId} className="m-0 flex list-none flex-col gap-1 p-0">
            {references.map((reference, index) => (
              <li key={`${referenceKey(reference)}-${index}`} className={rowClass}>
                <span className="min-w-0 flex-1 truncate" title={reference['@id']}>
                  {titleOf(reference)}
                  {typeof reference['@type'] === 'string' ? (
                    <span className="ml-1 text-xs text-quanta-pigeon">{reference['@type']}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className={iconButtonClass}
                  aria-label={`Move “${titleOf(reference)}” up`}
                  disabled={index === 0}
                  onClick={() => commit(moveReference(references, index, index - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={iconButtonClass}
                  aria-label={`Move “${titleOf(reference)}” down`}
                  disabled={index === references.length - 1}
                  onClick={() => commit(moveReference(references, index, index + 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={iconButtonClass}
                  aria-label={`Remove “${titleOf(reference)}”`}
                  onClick={() => commit(references.filter((_, at) => at !== index))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          {Picker ? (
            <button
              type="button"
              aria-expanded={browsing}
              aria-controls={pickerId}
              onClick={() => setBrowsing((open) => !open)}
              className={buttonClass}
            >
              {browsing ? 'Done' : 'Add…'}
            </button>
          ) : (
            <p className="text-xs font-normal text-quanta-pigeon">
              No content picker is registered in this editor.
            </p>
          )}
          {Picker && browsing ? (
            // Mounted only while open: Blicca's picker is a pattern island
            // with a network round trip.
            <div id={pickerId}>
              <Picker
                mode="multiple"
                widgetOptions={props.widgetOptions}
                onChange={handlePicked}
              />
            </div>
          ) : null}
        </>
      )}
    />
  );
}

export default ReferencesWidget;
