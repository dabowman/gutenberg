/**
 * WordPress dependencies
 */
import { calendar as icon } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import initBlock from '../utils/init-block';
import metadata from './block.json';

import transforms from './transforms';

const { name } = metadata;

export { metadata, name };

export const settings = {
	icon,
	example: {},
	lazyEdit: () =>
		import( /* webpackChunkName: "calendar/editor" */ './edit' ),
	transforms,
};

export const init = () => initBlock( { name, metadata, settings } );
