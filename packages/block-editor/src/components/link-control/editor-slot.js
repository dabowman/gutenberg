/**
 * WordPress dependencies
 */
import { createSlotFill } from '@wordpress/components';

const { Slot: EditorSlot, Fill: EditorFill } = createSlotFill(
	'BlockEditorLinkControlEditor'
);

export { EditorSlot, EditorFill };
export default EditorSlot;
