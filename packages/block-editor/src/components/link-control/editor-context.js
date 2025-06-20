/**
 * WordPress dependencies
 */
import { createContext, useContext } from '@wordpress/element';

/**
 * @typedef WPLinkControlEditorContext
 *
 * @property {Object}   value         Current link value object with url, title, etc.
 * @property {Object}   attributes    Block attributes object.
 * @property {Function} setAttributes Function to update block attributes.
 */

/**
 * Context for link control editor extensibility.
 *
 * @type {import('react').Context<WPLinkControlEditorContext>}
 */
const LinkControlEditorContext = createContext( {
	value: {},
	attributes: {},
	setAttributes: () => {},
} );

/**
 * Hook to access the link control editor context.
 *
 * @since 6.9.0
 *
 * @return {WPLinkControlEditorContext} The link control editor context.
 */
export const useLinkControlEditorContext = () =>
	useContext( LinkControlEditorContext );

export default LinkControlEditorContext;
