/**
 * WordPress dependencies
 */
import {
	Button,
	__unstableMotion as motion,
	__unstableAnimatePresence as AnimatePresence,
} from '@wordpress/components';
import { chevronLeftSmall, chevronRightSmall } from '@wordpress/icons';
import { useReducedMotion, useInstanceId } from '@wordpress/compose';
import { _x, isRTL } from '@wordpress/i18n';
import { Fragment } from '@wordpress/element';

/**
 * An expandable drawer for showing additional settings.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children        The settings to be rendered inside the drawer.
 * @param {boolean}                   props.settingsOpen    Whether the drawer is open.
 * @param {(isOpen: boolean) => void} props.setSettingsOpen A function to toggle the drawer's open state.
 * @param {string}                    [props.title]         The title to be displayed on the drawer toggle.
 * @return {import('react').ReactElement} The rendered component.
 */
function LinkSettingsDrawer( {
	children,
	settingsOpen,
	setSettingsOpen,
	title = _x( 'Advanced', 'Additional link settings' ),
} ) {
	const prefersReducedMotion = useReducedMotion();
	const MaybeAnimatePresence = prefersReducedMotion
		? Fragment
		: AnimatePresence;
	const MaybeMotionDiv = prefersReducedMotion ? 'div' : motion.div;

	const id = useInstanceId( LinkSettingsDrawer );

	const settingsDrawerId = `link-control-settings-drawer-${ id }`;

	return (
		<>
			<Button
				__next40pxDefaultSize
				className="block-editor-link-control__drawer-toggle"
				aria-expanded={ settingsOpen }
				onClick={ () => setSettingsOpen( ! settingsOpen ) }
				icon={ isRTL() ? chevronLeftSmall : chevronRightSmall }
				aria-controls={ settingsDrawerId }
			>
				{ title }
			</Button>
			<MaybeAnimatePresence>
				{ settingsOpen && (
					<MaybeMotionDiv
						className="block-editor-link-control__drawer"
						hidden={ ! settingsOpen }
						id={ settingsDrawerId }
						initial="collapsed"
						animate="open"
						exit="collapsed"
						variants={ {
							open: { opacity: 1, height: 'auto' },
							collapsed: { opacity: 0, height: 0 },
						} }
						transition={ {
							duration: 0.1,
						} }
					>
						<div className="block-editor-link-control__drawer-inner">
							{ children }
						</div>
					</MaybeMotionDiv>
				) }
			</MaybeAnimatePresence>
		</>
	);
}

export default LinkSettingsDrawer;
