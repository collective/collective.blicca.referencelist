/**
 * The Reference List block's Aurora half: the npm entry point and the
 * bundle entry the Vite lib build compiles into the Python package's
 * `static/referencelist-block.js`. One record, one bundle, one `install()`.
 */
import ReferenceListEdit from './referencelist/ReferenceListEdit';
import ReferenceListIcon from './referencelist/ReferenceListIcon';
import ReferenceListView from './referencelist/ReferenceListView';
import ReferenceListSchema, { REFERENCELIST_BLOCK_TYPE } from './referencelist/schema';
import { registerReferenceListWidgets } from './widgets';
import './styles.css';

/**
 * `title` and `description` are plain strings (block add-on contract §1);
 * an entry missing a well-formed `id` or `title` silently vanishes from the
 * slash menu, and an `icon` given as a string breaks it.
 */
export const ReferenceListBlockInfo = {
  id: REFERENCELIST_BLOCK_TYPE,
  title: 'Reference list',
  description: 'A list of picked content items, like a listing',
  edit: ReferenceListEdit,
  view: ReferenceListView,
  blockSchema: ReferenceListSchema,
  icon: ReferenceListIcon,
  category: 'referencelist',
};

// The loader convention (block add-on contract §1): default-export an
// install function that registers the block and RETURNS the config.
export default function install(config: any) {
  // Before the block entry, so a host that reads the registry the moment a
  // block appears finds the widgets its schema names already present.
  registerReferenceListWidgets(config);
  config.blocks.blocksConfig[REFERENCELIST_BLOCK_TYPE] = ReferenceListBlockInfo;
  return config;
}

export {
  REFERENCELIST_BLOCK_TYPE,
  ReferenceListEdit,
  ReferenceListIcon,
  ReferenceListSchema,
  ReferenceListView,
};
