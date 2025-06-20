/**
 * External dependencies
 */
import { render, screen } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { SlotFillProvider } from '@wordpress/components';

/**
 * Internal dependencies
 */
import LinkControlEditorContext, { useLinkControlEditorContext } from '../editor-context';
import { EditorFill } from '../editor-slot';

const TestComponent = () => {
	const context = useLinkControlEditorContext();
	return (
		<div>
			<span data-testid="value">{ JSON.stringify( context.value ) }</span>
			<span data-testid="attributes">{ JSON.stringify( context.attributes ) }</span>
		</div>
	);
};

describe( 'LinkControlEditorContext', () => {
	it( 'provides context values correctly', () => {
		const testValue = { url: 'https://example.com', title: 'Example' };
		const testAttributes = { className: 'test-class', rel: 'nofollow' };
		const mockSetAttributes = jest.fn();

		const contextValue = {
			value: testValue,
			attributes: testAttributes,
			setAttributes: mockSetAttributes,
		};

		render(
			<SlotFillProvider>
				<LinkControlEditorContext.Provider value={ contextValue }>
					<TestComponent />
				</LinkControlEditorContext.Provider>
			</SlotFillProvider>
		);

		expect( screen.getByTestId( 'value' ) ).toHaveTextContent(
			JSON.stringify( testValue )
		);
		expect( screen.getByTestId( 'attributes' ) ).toHaveTextContent(
			JSON.stringify( testAttributes )
		);
	} );

	it( 'provides default context values when no provider', () => {
		render(
			<SlotFillProvider>
				<TestComponent />
			</SlotFillProvider>
		);

		expect( screen.getByTestId( 'value' ) ).toHaveTextContent( '{}' );
		expect( screen.getByTestId( 'attributes' ) ).toHaveTextContent( '{}' );
	} );
} );
