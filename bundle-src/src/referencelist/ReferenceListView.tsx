/**
 * The Reference List's markup, and in Aurora proper its public rendering.
 *
 * The anatomy is the one the Chameleon templates emit (`reference_list_view.pt`
 * and `reference_list_item_view.pt`), element for element: one scope-wrapped
 * stylesheet dresses the canvas and the public page. `tests/anatomy-cases.json`
 * holds both renderers to it.
 *
 * In edit mode every anchor loses its `href` and nothing else, so a click
 * selects the block instead of leaving the page, and the sheet never has to
 * select on `[href]`. With `linkItems` off there is no anchor to begin with.
 */
import {
  descriptionOf,
  headlineOf,
  headlineTagOf,
  itemTitleTagOf,
  linksItems,
  mergedItems,
  previewImage,
  referenceKey,
  showsCards,
  titleOf,
  variationOf,
  type ReferenceListData,
} from './data';

export type ReferenceListViewProps = {
  data?: ReferenceListData;
  isEditMode?: boolean;
};

export function ReferenceListView({ data = {}, isEditMode }: ReferenceListViewProps) {
  const variation = variationOf(data);
  const cards = showsCards(data);
  const headline = headlineOf(data);
  const HeadlineTag = headlineTagOf(data);
  const ItemTitleTag = itemTitleTagOf(data);
  const linked = linksItems(data);
  const { items } = mergedItems(data);

  return (
    <div className={`referencelist variation-${variation}`}>
      {headline ? <HeadlineTag className="headline">{headline}</HeadlineTag> : null}
      {items.length ? (
        <div className="referencelist-items">
          {items.map((item, index) => {
            const image = cards ? previewImage(item) : undefined;
            const description = descriptionOf(item);
            return (
              <article
                key={`${referenceKey(item)}-${index}`}
                className={cards ? 'item summary' : 'item'}
              >
                {image ? (
                  <picture>
                    <img
                      src={image.src}
                      alt=""
                      width={image.width}
                      height={image.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                ) : null}
                <div className="item-content">
                  <ItemTitleTag>
                    {linked ? (
                      <a {...(isEditMode ? {} : { href: item['@id'] })}>{titleOf(item)}</a>
                    ) : (
                      titleOf(item)
                    )}
                  </ItemTitleTag>
                  {description ? <p>{description}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default ReferenceListView;
