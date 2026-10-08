/**
 * The label/description chrome the sidebar widgets share.
 *
 * `BlockSettingsFormRenderer` renders no label of its own: it passes the
 * schema title down as the `label` prop, and never an `id`. So the shell
 * draws the label, generates the control id the label points at, and hands
 * that id to the widget. The classes are the host's own Tailwind utilities
 * (the block's stylesheet is scope-wrapped to roots the sidebar is outside
 * of); the `referencelist-*-widget` classes are ours, a hook that needs no
 * Tailwind.
 */
import { useId, type ReactNode } from 'react';

export const labelClass = 'w-fit cursor-default text-xs font-medium text-quanta-pigeon';

export const controlClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export const buttonClass = 'w-fit text-xs font-medium text-quanta-pigeon underline';

export type FieldShellProps = {
  /** The schema title, arriving as `label`. */
  label?: string;
  /** The schema `description`, spread through by the renderer. */
  description?: string;
  className?: string;
};

export function FieldShell({
  label,
  description,
  className,
  blockClass,
  render,
}: FieldShellProps & {
  blockClass: string;
  render: (controlId: string) => ReactNode;
}) {
  // Sanitized: React's generated ids carry punctuation illegal in a CSS
  // selector, and a host widget may use the id as a DOM id.
  const controlId = `${blockClass}-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  return (
    <div className={`${blockClass} flex flex-col gap-1${className ? ` ${className}` : ''}`}>
      {label ? (
        <label htmlFor={controlId} className={labelClass}>
          {label}
        </label>
      ) : null}
      {render(controlId)}
      {description ? (
        <p className="text-xs font-normal text-quanta-pigeon">{description}</p>
      ) : null}
    </div>
  );
}
