import { useResizeObserver, useMergeRefs } from '@wordpress/compose';
import { useCallback, useEffect, useState } from '@wordpress/element';

import Avatar from '../collaborators-presence/avatar';
import { AVATAR_IFRAME_STYLES } from './avatar-iframe-styles';
import { OVERLAY_IFRAME_STYLES } from './overlay-iframe-styles';
import { useBlockHighlighting } from './use-block-highlighting';
import { useRenderCursors } from './use-render-cursors';
import type { SelectionRect } from './use-render-cursors';

const RERENDER_DELAY_MS = 500;

interface OverlayProps {
	blockEditorDocument?: Document;
	postId: number | null;
	postType: string | null;
}

/**
 * Compute the bracket position from selection rects and anchor side.
 * The bracket is flush with the edge of the selection highlight
 * and vertically centered on the line at that edge.
 * @param rects
 * @param anchorSide
 * @param color
 */
function getBracketStyle(
	rects: SelectionRect[],
	anchorSide: 'left' | 'right',
	color: string
) {
	const isLeft = anchorSide === 'left';
	const rect = isLeft ? rects[ 0 ] : rects[ rects.length - 1 ];
	const bracketX = isLeft ? rect.x : rect.x + rect.width;

	return {
		left: `${ bracketX }px`,
		top: `${ rect.y }px`,
		height: `${ rect.height }px`,
		borderColor: color,
	};
}

/**
 * This component is responsible for rendering the overlay components within the editor iframe.
 *
 * @param props                     - The overlay props.
 * @param props.blockEditorDocument - The block editor document.
 * @param props.postId              - The ID of the post.
 * @param props.postType            - The type of the post.
 * @return The Overlay component.
 */
export function Overlay( {
	blockEditorDocument,
	postId,
	postType,
}: OverlayProps ) {
	// Use state for the overlay element so that the hook re-runs once the ref is attached.
	const [ overlayElement, setOverlayElement ] =
		useState< HTMLDivElement | null >( null );

	const { cursors, rerenderCursorsAfterDelay } = useRenderCursors(
		overlayElement,
		blockEditorDocument ?? null,
		postId ?? null,
		postType ?? null,
		RERENDER_DELAY_MS
	);

	const { highlights, rerenderHighlightsAfterDelay } = useBlockHighlighting(
		overlayElement,
		blockEditorDocument ?? null,
		postId ?? null,
		postType ?? null,
		RERENDER_DELAY_MS
	);

	// Detect layout changes on overlay (e.g. turning on "Show Template") and window
	// resizes, and re-render the cursors and block highlights.
	const onResize = useCallback( () => {
		rerenderCursorsAfterDelay();
		rerenderHighlightsAfterDelay();
	}, [ rerenderCursorsAfterDelay, rerenderHighlightsAfterDelay ] );
	const resizeObserverRef = useResizeObserver( onResize );

	// Trigger the initial position computation on mount.
	useEffect( () => {
		const cleanupCursors = rerenderCursorsAfterDelay();
		const cleanupHighlights = rerenderHighlightsAfterDelay();
		return () => {
			cleanupCursors();
			cleanupHighlights();
		};
	}, [ rerenderCursorsAfterDelay, rerenderHighlightsAfterDelay ] );

	// Merge the refs to use the same element for both overlay and resize observation
	const mergedRef = useMergeRefs< HTMLDivElement | null >( [
		setOverlayElement,
		resizeObserverRef,
	] );

	// This is a full overlay that covers the entire iframe document. Good for
	// scrollable elements like cursor indicators.
	return (
		<div className="collaborators-overlay-full" ref={ mergedRef }>
			<style>{ AVATAR_IFRAME_STYLES + OVERLAY_IFRAME_STYLES }</style>
			{ cursors.map( ( cursor ) => (
				<div key={ cursor.clientId }>
					{ cursor.selectionRects?.map( ( rect, index ) => (
						<div
							key={ `${ cursor.clientId }-sel-${ index }` }
							className="collaborators-overlay-selection-rect"
							style={ {
								left: `${ rect.x }px`,
								top: `${ rect.y }px`,
								width: `${ rect.width }px`,
								height: `${ rect.height }px`,
								backgroundColor: cursor.color,
							} }
						/>
					) ) }
					{ cursor.selectionRects?.length && cursor.anchorSide && (
						<div
							className={ `collaborators-overlay-selection-bracket collaborators-overlay-selection-bracket--${ cursor.anchorSide }` }
							style={ getBracketStyle(
								cursor.selectionRects,
								cursor.anchorSide,
								cursor.color
							) }
						/>
					) }
					<div
						className="collaborators-overlay-user"
						style={ {
							left: `${ cursor.x }px`,
							top: `${ cursor.y }px`,
						} }
					>
						<div
							className="collaborators-overlay-user-cursor"
							style={ {
								backgroundColor: cursor.color,
								height: `${ cursor.height }px`,
							} }
						/>
						<Avatar
							className="collaborators-overlay-user-label"
							variant="badge"
							size="small"
							src={ cursor.avatarUrl }
							name={ cursor.userName }
							borderColor={ cursor.color }
						/>
					</div>
				</div>
			) ) }
			{ highlights.map( ( highlight ) => (
				<Avatar
					key={ highlight.blockId }
					className="collaborators-overlay-block-label"
					variant="badge"
					size="small"
					src={ highlight.avatarUrl }
					name={ highlight.userName }
					borderColor={ highlight.color }
					style={ {
						left: `${ highlight.x }px`,
						top: `${ highlight.y }px`,
					} }
				/>
			) ) }
		</div>
	);
}
