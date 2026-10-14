import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { getStyleFieldDefinitionsFromRegistry } from "@plone/helpers";
import { useId, useState, useRef, useCallback } from "react";
import config from "@plone/registry";
const VARIATIONS = ["default", "summary", "grid"];
const DEFAULT_VARIATION = "default";
const CARD_VARIATIONS = ["summary", "grid"];
const REFERENCE_ATTRS = [
  "@id",
  "UID",
  "@type",
  "title",
  "description",
  "image_field",
  "image_scales",
  "hasPreviewImage"
];
const asText$1 = (value) => typeof value === "string" ? value.trim() : "";
function variationOf(data = {}) {
  const value = data.variation;
  return VARIATIONS.includes(value) ? value : DEFAULT_VARIATION;
}
function showsCards(data = {}) {
  return CARD_VARIATIONS.includes(variationOf(data));
}
function headlineOf(data = {}) {
  return asText$1(data.headline);
}
function headlineTagOf(data = {}) {
  return data.headlineTag === "h3" ? "h3" : "h2";
}
function itemTitleTagOf(data = {}) {
  const tag = headlineTagOf(data);
  if (!headlineOf(data)) return tag;
  return tag === "h2" ? "h3" : "h4";
}
function linksItems(data = {}) {
  return data.linkItems !== false;
}
function isReference(value) {
  return typeof value === "object" && value !== null && typeof value["@id"] === "string" && value["@id"] !== "";
}
function storedReferences(value) {
  if (!Array.isArray(value)) return [];
  const references = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim()) {
      references.push({ "@id": entry.trim() });
    } else if (isReference(entry)) {
      references.push(entry);
    }
  }
  return references;
}
function referenceKey(reference) {
  return typeof reference.UID === "string" && reference.UID ? reference.UID : reference["@id"];
}
function referenceFrom(brain) {
  if (!isReference(brain)) return null;
  const reference = {};
  for (const key of REFERENCE_ATTRS) {
    if (brain[key] !== void 0) reference[key] = brain[key];
  }
  return reference;
}
function derivedItems(data = {}) {
  return Array.isArray(data.items) ? data.items.filter(isReference) : [];
}
function missingOf(data = {}) {
  return Array.isArray(data.missing) ? data.missing.filter((entry) => typeof entry === "string") : [];
}
function mergedItems(data = {}) {
  if (data.references === void 0) {
    return { items: derivedItems(data), missing: [] };
  }
  const references = storedReferences(data.references);
  const fresh = /* @__PURE__ */ new Map();
  for (const item of derivedItems(data)) {
    if (typeof item.UID === "string" && item.UID) fresh.set(item.UID, item);
    fresh.set(item["@id"], item);
  }
  const missing = new Set(missingOf(data));
  const result = { items: [], missing: [] };
  for (const reference of references) {
    const item = (typeof reference.UID === "string" ? fresh.get(reference.UID) : void 0) ?? fresh.get(reference["@id"]);
    if (item) result.items.push(item);
    else if (missing.has(reference["@id"])) result.missing.push(reference);
    else result.items.push(reference);
  }
  return result;
}
function previewImage(item) {
  const scales = item.image_scales ?? {};
  const field = typeof item.image_field === "string" && item.image_field || ("image" in scales ? "image" : Object.keys(scales)[0]);
  const image = field ? scales[field]?.[0] : void 0;
  const named = image?.scales ?? {};
  const scale = named.preview ?? named.large ?? named.thumb;
  if (!scale?.download) return void 0;
  return {
    src: `${image?.base_path || item["@id"]}/${scale.download}`,
    width: scale.width,
    height: scale.height
  };
}
function hrefOf(item) {
  return item.use_view_action_in_listings === true ? `${item["@id"]}/view` : item["@id"];
}
function titleOf(item) {
  return asText$1(item.title) || asText$1(item.id) || item["@id"];
}
function descriptionOf(item) {
  return asText$1(item.description);
}
function ReferenceListView({ data = {}, isEditMode }) {
  const variation = variationOf(data);
  const cards = showsCards(data);
  const headline = headlineOf(data);
  const HeadlineTag = headlineTagOf(data);
  const ItemTitleTag = itemTitleTagOf(data);
  const linked = linksItems(data);
  const { items } = mergedItems(data);
  return /* @__PURE__ */ jsxs("div", { className: `referencelist variation-${variation}`, children: [
    headline ? /* @__PURE__ */ jsx(HeadlineTag, { className: "headline", children: headline }) : null,
    items.length ? /* @__PURE__ */ jsx("div", { className: "referencelist-items", children: items.map((item, index) => {
      const image = cards ? previewImage(item) : void 0;
      const description = descriptionOf(item);
      return /* @__PURE__ */ jsxs(
        "article",
        {
          className: cards ? "item summary" : "item",
          children: [
            image ? /* @__PURE__ */ jsx("picture", { children: /* @__PURE__ */ jsx(
              "img",
              {
                src: image.src,
                alt: "",
                width: image.width,
                height: image.height,
                loading: "lazy",
                decoding: "async"
              }
            ) }) : null,
            /* @__PURE__ */ jsxs("div", { className: "item-content", children: [
              /* @__PURE__ */ jsx(ItemTitleTag, { children: linked ? /* @__PURE__ */ jsx("a", { ...isEditMode ? {} : { href: hrefOf(item) }, children: titleOf(item) }) : titleOf(item) }),
              description ? /* @__PURE__ */ jsx("p", { children: description }) : null
            ] })
          ]
        },
        `${referenceKey(item)}-${index}`
      );
    }) }) : null
  ] });
}
function ReferenceListEdit(props) {
  const data = props.data ?? {};
  const references = storedReferences(data.references);
  const { missing } = mergedItems(data);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(ReferenceListView, { data, isEditMode: true }),
    references.length === 0 ? /* @__PURE__ */ jsx("p", { className: "referencelist-notice", contentEditable: false, children: "No references yet. Pick content in the sidebar." }) : null,
    missing.map((reference) => /* @__PURE__ */ jsxs("p", { className: "referencelist-notice", contentEditable: false, children: [
      "“",
      titleOf(reference),
      "” no longer exists and is not shown."
    ] }, reference["@id"]))
  ] });
}
function ReferenceListIcon(props) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      focusable: "false",
      ...props,
      children: [
        /* @__PURE__ */ jsx("rect", { x: "3.5", y: "4", width: "4", height: "4", rx: "1" }),
        /* @__PURE__ */ jsx("rect", { x: "3.5", y: "10", width: "4", height: "4", rx: "1" }),
        /* @__PURE__ */ jsx("rect", { x: "3.5", y: "16", width: "4", height: "4", rx: "1" }),
        /* @__PURE__ */ jsx("path", { d: "M10.5 6h10M10.5 12h10M10.5 18h10" })
      ]
    }
  );
}
const REFERENCELIST_BLOCK_TYPE = "plone-collective.referencelist";
const BACKGROUND_FIELD_NAME = "backgroundColor";
const VARIATION_CHOICES = [
  ["default", "Default"],
  ["summary", "Summary"],
  ["grid", "Grid"]
];
const HEADLINE_TAG_CHOICES = [
  ["h2", "H2"],
  ["h3", "H3"]
];
function backgroundField(data) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType: REFERENCELIST_BLOCK_TYPE,
    fieldName: BACKGROUND_FIELD_NAME
  });
  const choices = definitions.filter((definition) => typeof definition?.name === "string").map((definition) => [definition.name, definition.label || definition.name]);
  if (!choices.length) return null;
  return {
    title: "Background",
    choices,
    ...choices.some(([name]) => name === "none") ? { default: "none" } : {},
    styleField: true
  };
}
function ReferenceListSchema({
  formData = {}
} = {}) {
  const background = backgroundField(formData);
  return {
    title: "Reference list",
    fieldsets: [
      {
        id: "default",
        title: "Default",
        fields: ["headline", "headlineTag", "variation", "linkItems", "references"]
      },
      {
        id: "styling",
        title: "Styling",
        fields: ["blockWidth", ...background ? [BACKGROUND_FIELD_NAME] : []]
      }
    ],
    properties: {
      headline: { title: "Headline" },
      headlineTag: {
        title: "Headline tag",
        widget: "referencelist_select",
        choices: HEADLINE_TAG_CHOICES,
        default: "h2"
      },
      variation: {
        title: "Variation",
        widget: "referencelist_select",
        choices: VARIATION_CHOICES,
        default: "default"
      },
      linkItems: {
        title: "Link items",
        description: "Make each item title a link to the item.",
        type: "boolean",
        // Not a storage guarantee: both renderers read an absent value as on.
        default: true
      },
      references: {
        title: "References",
        description: "The content to list, in this order.",
        widget: "referencelist_references"
      },
      blockWidth: {
        title: "Block width",
        widget: "width",
        default: "default",
        styleField: true
      },
      ...background ? { [BACKGROUND_FIELD_NAME]: background } : {}
    },
    required: []
  };
}
const labelClass = "w-fit cursor-default text-xs font-medium text-quanta-pigeon";
const controlClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
function FieldShell({
  label,
  description,
  className,
  blockClass,
  render
}) {
  const controlId = `${blockClass}-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  return /* @__PURE__ */ jsxs("div", { className: `${blockClass} flex flex-col gap-1${className ? ` ${className}` : ""}`, children: [
    label ? /* @__PURE__ */ jsx("label", { htmlFor: controlId, className: labelClass, children: label }) : null,
    render(controlId),
    description ? /* @__PURE__ */ jsx("p", { className: "text-xs font-normal text-quanta-pigeon", children: description }) : null
  ] });
}
const asText = (value) => typeof value === "string" ? value : value == null ? "" : String(value);
function ReferenceListSelectWidget(props) {
  const { label, description, className, choices = [], onChange } = props;
  const stored = asText(props.value ?? props.defaultValue);
  const current = stored || asText(props.default);
  const known = choices.some(([value]) => value === current);
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "referencelist-select-widget",
      label,
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs(
        "select",
        {
          id: controlId,
          name: props.name,
          required: props.required,
          value: current,
          onChange: (event) => onChange?.(event.target.value),
          className: controlClass,
          children: [
            current === "" ? /* @__PURE__ */ jsx("option", { value: "" }) : null,
            current !== "" && !known ? /* @__PURE__ */ jsx("option", { value: current, children: current }) : null,
            choices.map(([value, choiceLabel]) => /* @__PURE__ */ jsx("option", { value, children: choiceLabel }, value))
          ]
        }
      )
    }
  );
}
function pickedReferences(current, picked) {
  if (!Array.isArray(picked)) return current;
  const stored = /* @__PURE__ */ new Map();
  for (const reference of current) {
    stored.set(referenceKey(reference), reference);
    stored.set(reference["@id"], reference);
  }
  const seen = /* @__PURE__ */ new Set();
  const next = [];
  for (const brain of picked) {
    const fresh = referenceFrom(brain ?? {});
    if (!fresh || seen.has(referenceKey(fresh))) continue;
    seen.add(referenceKey(fresh));
    const known = stored.get(referenceKey(fresh)) ?? stored.get(fresh["@id"]);
    next.push(known ? { ...known, ...fresh } : fresh);
  }
  return next;
}
function ReferencesWidget(props) {
  const { label, description, className, onChange } = props;
  const incoming = storedReferences(props.value ?? props.defaultValue);
  const incomingKey = JSON.stringify(incoming);
  const [state, setState] = useState(() => ({
    incoming: incomingKey,
    references: incoming,
    generation: 0
  }));
  if (state.incoming !== incomingKey) {
    const own = JSON.stringify(state.references) === incomingKey;
    setState({
      incoming: incomingKey,
      references: incoming,
      generation: own ? state.generation : state.generation + 1
    });
  }
  const latest = useRef(state.references);
  latest.current = state.references;
  const handlePicked = useCallback(
    (selected) => {
      const next = pickedReferences(latest.current, selected);
      if (JSON.stringify(next) === JSON.stringify(latest.current)) return;
      latest.current = next;
      setState((current) => ({ ...current, references: next }));
      onChange?.(next);
    },
    [onChange]
  );
  const Picker = config.getWidget("object_browser");
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "referencelist-references-widget",
      label,
      description,
      className,
      render: (controlId) => Picker ? /* @__PURE__ */ jsx(
        Picker,
        {
          id: controlId,
          mode: "multiple",
          defaultValue: state.references,
          selectedItemAttrs: REFERENCE_ATTRS,
          widgetOptions: props.widgetOptions,
          onChange: handlePicked
        },
        state.generation
      ) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("ol", { id: controlId, className: "m-0 list-inside p-0 text-sm text-quanta-iron", children: state.references.map((reference) => /* @__PURE__ */ jsx("li", { children: titleOf(reference) }, referenceKey(reference))) }),
        /* @__PURE__ */ jsx("p", { className: "text-xs font-normal text-quanta-pigeon", children: "No content picker is registered in this editor." })
      ] })
    }
  );
}
const REFERENCELIST_WIDGETS = {
  referencelist_select: ReferenceListSelectWidget,
  referencelist_references: ReferencesWidget
};
function registerReferenceListWidgets(config2) {
  config2.registerWidget({ key: "widget", definition: { ...REFERENCELIST_WIDGETS } });
  return config2;
}
const ReferenceListBlockInfo = {
  id: REFERENCELIST_BLOCK_TYPE,
  title: "Reference list",
  description: "A list of picked content items, like a listing",
  edit: ReferenceListEdit,
  view: ReferenceListView,
  blockSchema: ReferenceListSchema,
  icon: ReferenceListIcon,
  category: "referencelist"
};
function install(config2) {
  registerReferenceListWidgets(config2);
  config2.blocks.blocksConfig[REFERENCELIST_BLOCK_TYPE] = ReferenceListBlockInfo;
  return config2;
}
export {
  REFERENCELIST_BLOCK_TYPE,
  ReferenceListBlockInfo,
  ReferenceListEdit,
  ReferenceListIcon,
  ReferenceListSchema,
  ReferenceListView,
  install as default
};
//# sourceMappingURL=referencelist-block.js.map
