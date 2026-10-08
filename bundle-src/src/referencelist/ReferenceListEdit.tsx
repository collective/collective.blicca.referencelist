/**
 * The `edit` half: the canvas is a live preview; editing happens in the
 * sidebar. What the canvas adds is honesty: an empty block says so, and a
 * reference the server could not resolve is named instead of silently
 * dropped. The notices live outside the block root and are not editable.
 */
import { mergedItems, storedReferences, titleOf, type ReferenceListData } from './data';
import ReferenceListView from './ReferenceListView';

export type ReferenceListEditProps = {
  data?: ReferenceListData;
};

export function ReferenceListEdit(props: ReferenceListEditProps) {
  const data = props.data ?? {};
  const references = storedReferences(data.references);
  const { missing } = mergedItems(data);
  return (
    <>
      <ReferenceListView data={data} isEditMode />
      {references.length === 0 ? (
        <p className="referencelist-notice" contentEditable={false}>
          No references yet. Pick content in the sidebar.
        </p>
      ) : null}
      {missing.map((reference) => (
        <p key={reference['@id']} className="referencelist-notice" contentEditable={false}>
          “{titleOf(reference)}” no longer exists and is not shown.
        </p>
      ))}
    </>
  );
}

export default ReferenceListEdit;
