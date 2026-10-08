/**
 * `referencelist_references` — the picked items, kept in the host's own
 * content picker.
 *
 * The picker is looked up as `config.getWidget('object_browser')`, never
 * imported: Blicca's is a `pat-contentbrowser` island, Aurora's needs the
 * edit route, and each works in its own host. It is mounted in `multiple`
 * mode on the stored references and owns the list: it shows the picked
 * items, adds several at once, removes and reorders them, and reports the
 * whole selection on every change. That selection replaces the stored list.
 *
 * What is stored per item is `referenceFrom(brain)`: the `@id` (rewritten
 * to a resolveuid reference on save), the UID, the type and a snapshot the
 * canvas shows until the server has resolved the reference. Nothing here
 * is screened or resolved; the server derives the live summaries.
 */
import { useCallback, useRef, useState, type ComponentType } from 'react';
import config from '@plone/registry';

import {
  REFERENCE_ATTRS,
  referenceFrom,
  referenceKey,
  storedReferences,
  titleOf,
  type Reference,
} from '../referencelist/data';
import { FieldShell, type FieldShellProps } from './field-shell';

export type ReferencesWidgetProps = FieldShellProps & {
  name?: string;
  defaultValue?: unknown;
  value?: unknown;
  /** Forwarded to the host's picker untouched (`pattern_options.selectableTypes`). */
  widgetOptions?: Record<string, unknown>;
  onChange?: (value: Reference[]) => void;
};

/**
 * The stored list for the selection a picker reports, in its order. A
 * reference already stored keeps what the picker does not report again.
 */
export function pickedReferences(current: Reference[], picked: unknown): Reference[] {
  if (!Array.isArray(picked)) return current;
  const stored = new Map<string, Reference>();
  for (const reference of current) {
    stored.set(referenceKey(reference), reference);
    stored.set(reference['@id'], reference);
  }
  const seen = new Set<string>();
  const next: Reference[] = [];
  for (const brain of picked) {
    const fresh = referenceFrom((brain ?? {}) as Record<string, unknown>);
    if (!fresh || seen.has(referenceKey(fresh))) continue;
    seen.add(referenceKey(fresh));
    const known = stored.get(referenceKey(fresh)) ?? stored.get(fresh['@id']);
    next.push(known ? { ...known, ...fresh } : fresh);
  }
  return next;
}

type PickerState = { incoming: string; references: Reference[]; generation: number };

export function ReferencesWidget(props: ReferencesWidgetProps) {
  const { label, description, className, onChange } = props;
  const incoming = storedReferences(props.value ?? props.defaultValue);
  const incomingKey = JSON.stringify(incoming);
  // The picker reads its selection once, on mount. A stored value the
  // widget did not report itself (a reload, an undo) remounts it.
  const [state, setState] = useState<PickerState>(() => ({
    incoming: incomingKey,
    references: incoming,
    generation: 0,
  }));
  if (state.incoming !== incomingKey) {
    const own = JSON.stringify(state.references) === incomingKey;
    setState({
      incoming: incomingKey,
      references: incoming,
      generation: own ? state.generation : state.generation + 1,
    });
  }
  // A picker may hold on to an old callback; it must still merge into the
  // list as it is now.
  const latest = useRef(state.references);
  latest.current = state.references;

  const handlePicked = useCallback(
    (selected: unknown) => {
      const next = pickedReferences(latest.current, selected);
      if (JSON.stringify(next) === JSON.stringify(latest.current)) return;
      latest.current = next;
      setState((current) => ({ ...current, references: next }));
      onChange?.(next);
    },
    [onChange],
  );

  const Picker = config.getWidget('object_browser') as ComponentType<any> | undefined;

  return (
    <FieldShell
      blockClass="referencelist-references-widget"
      label={label}
      description={description}
      className={className}
      render={(controlId) =>
        Picker ? (
          <Picker
            key={state.generation}
            id={controlId}
            mode="multiple"
            defaultValue={state.references}
            selectedItemAttrs={REFERENCE_ATTRS}
            widgetOptions={props.widgetOptions}
            onChange={handlePicked}
          />
        ) : (
          <>
            <ol id={controlId} className="m-0 list-inside p-0 text-sm text-quanta-iron">
              {state.references.map((reference) => (
                <li key={referenceKey(reference)}>{titleOf(reference)}</li>
              ))}
            </ol>
            <p className="text-xs font-normal text-quanta-pigeon">
              No content picker is registered in this editor.
            </p>
          </>
        )
      }
    />
  );
}

export default ReferencesWidget;
