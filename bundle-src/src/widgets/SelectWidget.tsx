/**
 * `referencelist_select` — a `<select>` over a schema property's `choices`.
 *
 * Only the Blicca host registers a `choices` widget; in Aurora proper a
 * field relying on `choices` alone degrades to a text input. Naming the
 * widget resolves the same field to this control in both hosts.
 *
 * Controlled: a select has no caret to lose. With nothing stored it shows
 * the schema's `default`, which is what both renderers fall back to; showing
 * it is not storing it.
 */
import { FieldShell, controlClass, type FieldShellProps } from './field-shell';

export type ReferenceListSelectWidgetProps = FieldShellProps & {
  name?: string;
  choices?: Array<[string, string]>;
  defaultValue?: unknown;
  value?: unknown;
  default?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

export function ReferenceListSelectWidget(props: ReferenceListSelectWidgetProps) {
  const { label, description, className, choices = [], onChange } = props;
  const stored = asText(props.value ?? props.defaultValue);
  const current = stored || asText(props.default);
  const known = choices.some(([value]) => value === current);

  return (
    <FieldShell
      blockClass="referencelist-select-widget"
      label={label}
      description={description}
      className={className}
      render={(controlId) => (
        <select
          id={controlId}
          name={props.name}
          required={props.required}
          value={current}
          onChange={(event) => onChange?.(event.target.value)}
          className={controlClass}
        >
          {current === '' ? <option value="" /> : null}
          {current !== '' && !known ? <option value={current}>{current}</option> : null}
          {choices.map(([value, choiceLabel]) => (
            <option key={value} value={value}>
              {choiceLabel}
            </option>
          ))}
        </select>
      )}
    />
  );
}

export default ReferenceListSelectWidget;
