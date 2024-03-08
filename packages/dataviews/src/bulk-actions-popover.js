/**
 * WordPress dependencies
 */
import {
	ToolbarButton,
	Toolbar,
	ToolbarGroup,
	Popover,
} from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { _n, sprintf } from '@wordpress/i18n';
import { close } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { ActionWithModal } from './item-actions';

function PrimaryActionTrigger( { action, onClick, items } ) {
	const isDisabled = useMemo( () => {
		return items.some( ( item ) => ! action.isEligible( item ) );
	}, [ action, items ] );
	return (
		<ToolbarButton
			disabled={ isDisabled }
			label={ action.label }
			icon={ action.icon }
			isDestructive={ action.isDestructive }
			size="compact"
			onClick={ onClick }
		/>
	);
}

const EMPTY_ARRAY = [];

export default function BulkActionsPopover( {
	data,
	selection,
	actions = EMPTY_ARRAY,
	setSelection,
	getItemId,
} ) {
	const selectedItems = useMemo( () => {
		return data.filter( ( item ) =>
			selection.includes( getItemId( item ) )
		);
	}, [ selection, data, getItemId ] );

	const primaryActionsToShow = useMemo(
		() =>
			actions.filter( ( action ) => {
				return (
					action.supportsBulk &&
					action.isPrimary &&
					selectedItems.some( ( item ) => action.isEligible( item ) )
				);
			} ),
		[ actions, selectedItems ]
	);

	if (
		( selection && selection.length === 0 ) ||
		primaryActionsToShow.length === 0
	) {
		return null;
	}

	return (
		<Popover
			placement="bottom-middle"
			className="dataviews-bulk-actions-popover"
		>
			<Toolbar label="Bulk actions">
				<div className="dataviews-bulk-actions-toolbar-wrapper">
					<ToolbarGroup>
						<ToolbarButton onClick={ () => {} } disabled>
							{
								// translators: %s: Total number of selected items.
								sprintf(
									// translators: %s: Total number of selected items.
									_n(
										'%s item',
										'%s items',
										selection.length
									),
									selection.length
								)
							}
						</ToolbarButton>
						{ primaryActionsToShow.map( ( action ) => {
							if ( !! action.RenderModal ) {
								return (
									<ActionWithModal
										key={ action.id }
										action={ action }
										items={ selectedItems }
										ActionTrigger={ PrimaryActionTrigger }
									/>
								);
							}
							return (
								<PrimaryActionTrigger
									key={ action.id }
									action={ action }
									items={ selectedItems }
									onClick={ () =>
										action.callback( selectedItems )
									}
								/>
							);
						} ) }
					</ToolbarGroup>
					<ToolbarGroup>
						<ToolbarButton
							icon={ close }
							onClick={ () => {
								setSelection( EMPTY_ARRAY );
							} }
						/>
					</ToolbarGroup>
				</div>
			</Toolbar>
		</Popover>
	);
}
