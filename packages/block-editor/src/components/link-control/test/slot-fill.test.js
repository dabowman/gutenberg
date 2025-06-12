/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useSlot } from '@wordpress/compose';
import { SlotFillProvider } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { LinkPopoverFill, LinkPopoverSlot } from '../slot-fill';
import { LinkPopoverContext, useLinkPopoverContext } from '../context';

// Mock useSlot to control the presence of fills for testing.
jest.mock( '@wordpress/compose', () => ( {
	...jest.requireActual( '@wordpress/compose' ),
	useSlot: jest.fn(),
} ) );

const TestFill = () => {
	const { attributes, setAttributes } = useLinkPopoverContext();
	return (
		<button
			type="button"
			onClick={ () => setAttributes( { rel: 'nofollow' } ) }
		>
			{ `Current rel: ${ attributes.rel }` }
		</button>
	);
};

describe( 'LinkPopoverSlot/Fill', () => {
	it( 'should not render the slot when no fills are registered', () => {
		useSlot.mockReturnValue( { fills: [] } );
		render( <LinkPopoverSlot /> );
		expect( screen.queryByRole( 'button' ) ).not.toBeInTheDocument();
	} );

	it( 'should render the slot with fills and provide context', () => {
		useSlot.mockReturnValue( { fills: [ <TestFill key="test" /> ] } );

		const mockSetAttributes = jest.fn();
		const contextValue = {
			attributes: { url: 'https://wordpress.org', rel: 'noopener' },
			setAttributes: mockSetAttributes,
		};

		render(
			<SlotFillProvider>
				<LinkPopoverContext.Provider value={ contextValue }>
					<LinkPopoverFill>
						<TestFill />
					</LinkPopoverFill>
					<LinkPopoverSlot />
				</LinkPopoverContext.Provider>
			</SlotFillProvider>
		);

		const button = screen.getByRole( 'button', { name: /Current rel/ } );
		expect( button ).toBeInTheDocument();
		expect( button ).toHaveTextContent( 'Current rel: noopener' );

		button.click();
		expect( mockSetAttributes ).toHaveBeenCalledWith( {
			rel: 'nofollow',
		} );
	} );
} );
