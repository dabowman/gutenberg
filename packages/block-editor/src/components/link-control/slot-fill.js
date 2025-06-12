/**
 * WordPress dependencies
 */
import { createSlotFill } from '@wordpress/components';

const { Fill, Slot } = createSlotFill( 'LinkPopover' );

Fill.displayName = 'LinkPopover.Fill';

/**
 * A component that renders its children into the Link Popover's "Advanced" section.
 *
 * @see __experimentalLinkPopoverSlot
 */
export const LinkPopoverFill = Fill;

/**
 * A component that renders all registered fills for the `__experimentalLinkPopoverFill`
 * into the Link Popover's "Advanced" section.
 *
 * @see __experimentalLinkPopoverFill
 */
export const LinkPopoverSlot = Slot;
