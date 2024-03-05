/**
 * WordPress dependencies
 */
import { SVG, Path, G } from '@wordpress/primitives';

const connection = (
	<SVG
		width="24"
		height="24"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fillRule="evenodd"
	>
		<Path d="M5 19L8 16L5 19Z" />
		<Path d="M16 8L19 5L16 8Z" />
		<G>
			<Path d="M5 19L8 16" />
			<Path d="M9.30003 17.3C9.523 17.5237 9.78794 17.7013 10.0797 17.8224C10.3714 17.9435 10.6842 18.0059 11 18.0059C11.3159 18.0059 11.6287 17.9435 11.9204 17.8224C12.2121 17.7013 12.4771 17.5237 12.7 17.3L15 15L9.00003 9L6.70003 11.3C6.47629 11.523 6.29876 11.7879 6.17763 12.0796C6.05649 12.3714 5.99414 12.6841 5.99414 13C5.99414 13.3159 6.05649 13.6286 6.17763 13.9204C6.29876 14.2121 6.47629 14.477 6.70003 14.7L9.30003 17.3Z" />
			<Path d="M16 8L19 5" />
			<Path d="M9 9.00003L15 15L17.3 12.7C17.5237 12.4771 17.7013 12.2121 17.8224 11.9204C17.9435 11.6287 18.0059 11.3159 18.0059 11C18.0059 10.6842 17.9435 10.3714 17.8224 10.0797C17.7013 9.78794 17.5237 9.523 17.3 9.30003L14.7 6.70003C14.477 6.47629 14.2121 6.29876 13.9204 6.17763C13.6286 6.05649 13.3159 5.99414 13 5.99414C12.6841 5.99414 12.3714 6.05649 12.0796 6.17763C11.7879 6.29876 11.523 6.47629 11.3 6.70003L9 9.00003Z" />
		</G>
	</SVG>
);

export default connection;