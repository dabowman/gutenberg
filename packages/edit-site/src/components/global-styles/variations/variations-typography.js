/**
 * WordPress dependencies
 */
import { useContext, useMemo } from '@wordpress/element';
import {
	__experimentalGrid as Grid,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { privateApis as blockEditorPrivateApis } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import { mergeBaseAndUserConfigs } from '../global-styles-provider';
import { unlock } from '../../../lock-unlock';
import { useCurrentMergeThemeStyleVariationsWithUserConfig } from '../../../hooks/use-theme-style-variations/use-theme-style-variations-by-property';
import TypographyExample from '../typography-example';
import PreviewIframe from '../preview-iframe';
import { getFontFamilies } from '../utils';
import Variation from './variation';

const { GlobalStylesContext } = unlock( blockEditorPrivateApis );

export default function TypographyVariations() {
	const typographyVariations =
		useCurrentMergeThemeStyleVariationsWithUserConfig( {
			property: 'typography',
		} );

	const { base } = useContext( GlobalStylesContext );

	/*
	 * Filter duplicate variations based on the font families used in the variation.
	 */
	const uniqueTypographyVariations = useMemo( () => {
		return typographyVariations?.length
			? Object.values(
					typographyVariations.reduce( ( acc, variation ) => {
						const [ bodyFontFamily, headingFontFamily ] =
							getFontFamilies(
								mergeBaseAndUserConfigs( base, variation )
							);
						if (
							headingFontFamily?.name &&
							bodyFontFamily?.name &&
							! acc[
								`${ headingFontFamily?.name }:${ bodyFontFamily?.name }`
							]
						) {
							acc[
								`${ headingFontFamily?.name }:${ bodyFontFamily?.name }`
							] = variation;
						}

						return acc;
					}, {} )
			  )
			: [];
	}, [ base, typographyVariations ] );

	if ( ! typographyVariations?.length ) {
		return null;
	}

	return (
		<VStack spacing={ 3 }>
			<Grid
				columns={ 3 }
				className="edit-site-global-styles-style-variations-container"
			>
				{ uniqueTypographyVariations.map( ( variation, index ) => (
					<Variation key={ index } variation={ variation }>
						{ ( isFocused ) => (
							<PreviewIframe
								label={ variation?.title }
								isFocused={ isFocused }
							>
								{ ( { key } ) => (
									<TypographyExample
										key={ key }
										variation={ variation }
									/>
								) }
							</PreviewIframe>
						) }
					</Variation>
				) ) }
			</Grid>
		</VStack>
	);
}
