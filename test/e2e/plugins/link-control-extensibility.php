<?php
/**
 * Plugin Name: Link Control Extensibility Test Plugin
 * Description: Test plugin for link control extensibility features
 * Version: 1.0.0
 * Author: WordPress Contributors
 *
 * @package gutenberg-test
 */

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enqueue the test plugin script.
 */
function enqueue_link_control_extensibility_test() {
	$script_path       = plugin_dir_path( __FILE__ ) . 'link-control-extensibility.js';
	$script_asset_path = plugin_dir_path( __FILE__ ) . 'link-control-extensibility.asset.php';
	$script_asset      = file_exists( $script_asset_path )
		? require $script_asset_path
		: array(
			'dependencies' => array( 'wp-blocks', 'wp-element', 'wp-i18n', 'wp-block-editor', 'wp-components' ),
			'version'      => '1.0.0',
		);

	wp_register_script(
		'link-control-extensibility-test',
		plugins_url( 'link-control-extensibility.js', __FILE__ ),
		$script_asset['dependencies'],
		$script_asset['version'],
		true
	);

	wp_enqueue_script( 'link-control-extensibility-test' );
}
add_action( 'enqueue_block_editor_assets', 'enqueue_link_control_extensibility_test' );

/**
 * Enable the link control extensibility feature flag.
 */
function enable_link_control_extensibility( $settings ) {
	$settings['linkControlExtensibility'] = true;
	return $settings;
}
add_filter( 'block_editor_settings_all', 'enable_link_control_extensibility' );
