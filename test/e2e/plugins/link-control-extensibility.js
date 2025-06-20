( function () {
	const { __ } = wp.i18n;
	const { ToggleControl } = wp.components;
	const {
		__experimentalLinkControlEditorFill: LinkControlEditorFill,
		__experimentalUseLinkControlEditorContext: useLinkControlEditorContext
	} = wp.blockEditor;
	const { createElement: el } = wp.element;

	/**
	 * NoFollow Toggle Component
	 *
	 * Adds a toggle to control the rel="nofollow" attribute on links.
	 */
	function NoFollowToggle() {
		const { value, attributes, setAttributes } = useLinkControlEditorContext();

		if ( ! value || ! value.url ) {
			return null;
		}

		const currentRel = attributes.rel || '';
		const relArray = currentRel.split( ' ' ).filter( Boolean );
		const isNoFollowEnabled = relArray.includes( 'nofollow' );

		const handleToggle = ( isChecked ) => {
			let newRelArray = [ ...relArray ];

			if ( isChecked ) {
				if ( ! newRelArray.includes( 'nofollow' ) ) {
					newRelArray.push( 'nofollow' );
				}
			} else {
				const index = newRelArray.indexOf( 'nofollow' );
				if ( index > -1 ) {
					newRelArray.splice( index, 1 );
				}
			}

			setAttributes( {
				rel: newRelArray.length ? newRelArray.join( ' ' ) : undefined
			} );
		};

		return el( ToggleControl, {
			'data-testid': 'nofollow-toggle',
			label: __( 'Add nofollow to link', 'gutenberg' ),
			help: __( 'Prevent search engines from following this link', 'gutenberg' ),
			checked: isNoFollowEnabled,
			onChange: handleToggle,
		} );
	}

	/**
	 * SEO Controls Component
	 *
	 * Groups SEO-related link controls together.
	 */
	function SEOControls() {
		return el( 'div', {
			'data-testid': 'seo-controls',
			style: {
				padding: '12px 0',
				borderTop: '1px solid #e0e0e0',
				marginTop: '12px'
			}
		}, [
			el( 'h4', {
				key: 'title',
				style: {
					margin: '0 0 8px 0',
					fontSize: '12px',
					fontWeight: '600',
					textTransform: 'uppercase',
					color: '#757575'
				}
			}, __( 'SEO Options', 'gutenberg' ) ),
			el( NoFollowToggle, { key: 'nofollow' } )
		] );
	}

	/**
	 * Register the Link Control extension.
	 */
	wp.domReady( function () {
		// Only register if the extensibility API is available.
		if ( LinkControlEditorFill && useLinkControlEditorContext ) {
			console.log( 'Link Control Extensibility: Registering SEO controls' );

			// Register the fill component.
			wp.element.render(
				el( LinkControlEditorFill, {
					key: 'seo-controls-fill'
				}, el( SEOControls ) ),
				document.createElement( 'div' )
			);
		} else {
			console.warn( 'Link Control Extensibility: API not available' );
		}
	} );
} )();
