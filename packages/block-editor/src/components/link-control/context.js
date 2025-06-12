/**
 * WordPress dependencies
 */
import { createContext, useContext } from '@wordpress/element';

/**
 * React context for sharing data between the Link Popover and its extensions.
 *
 * @see __experimentalUseLinkPopoverContext
 * @type {import('react').Context<import('./index').LinkPopoverContextValue>}
 */
export const LinkPopoverContext = createContext( null );

/**
 * A hook for retrieving the context of the Link Popover.
 *
 * @return {import('./index').LinkPopoverContextValue} The context value.
 */
export const useLinkPopoverContext = () => {
	return useContext( LinkPopoverContext );
};

export const LinkPopoverContextProvider = LinkPopoverContext.Provider;
