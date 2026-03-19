<?php

/**
 * RideLoop Theme Functions
 *
 * Handles script/style enqueueing, theme setup, navigation menus,
 * and the WordPress admin settings page for the Google Maps API key.
 */

// -------------------------------------------------------------------------
// Theme Setup
// -------------------------------------------------------------------------

function rideloop_setup() {
    // Allow WordPress to manage the document title
    add_theme_support('title-tag');

    // Enable post thumbnails
    add_theme_support('post-thumbnails');

    // HTML5 markup support
    add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption']);

    // Register primary navigation menu
    register_nav_menus([
        'primary' => __('Primary Menu', 'rideloop'),
    ]);
}
add_action('after_setup_theme', 'rideloop_setup');


// -------------------------------------------------------------------------
// Enqueue Styles & Scripts
// -------------------------------------------------------------------------

function rideloop_enqueue_assets() {
    $version = '1.0.0';

    // Google Fonts — Inter
    wp_enqueue_style(
        'rideloop-google-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        [],
        null
    );

    // Main stylesheet
    wp_enqueue_style(
        'rideloop-main',
        get_template_directory_uri() . '/assets/css/main.css',
        ['rideloop-google-fonts'],
        $version
    );

    // Main JS (utilities, nav toggle, etc.)
    wp_enqueue_script(
        'rideloop-main',
        get_template_directory_uri() . '/assets/js/main.js',
        [],
        $version,
        true // load in footer
    );

    // Load Google Maps Places on the front page for hero autocomplete
    if (is_front_page()) {
        $api_key = get_option('rideloop_google_maps_api_key', '');
        if (! empty($api_key)) {
            wp_enqueue_script(
                'google-maps-api-hero',
                'https://maps.googleapis.com/maps/api/js?key=' . esc_attr($api_key) . '&loading=async&libraries=places&callback=rideloopInitHero',
                ['rideloop-main'],
                null,
                true
            );
        }
    }

    // Only load the planner script + Google Maps on the planner page
    if (is_page_template('page-planner.php')) {
        $api_key = get_option('rideloop_google_maps_api_key', '');

        // Google Maps JS API (with Places library)
        // The callback "rideloopInitMap" is defined in planner.js
        if (! empty($api_key)) {
            wp_enqueue_script(
                'google-maps-api',
                'https://maps.googleapis.com/maps/api/js?key=' . esc_attr($api_key) . '&loading=async&libraries=places&callback=rideloopInitMap',
                ['rideloop-planner'], // load after planner.js so callback exists
                null,
                true
            );
        }

        // Planner JS — core route generation + map logic
        wp_enqueue_script(
            'rideloop-planner',
            get_template_directory_uri() . '/assets/js/planner.js',
            [],
            $version,
            true
        );

        // Pass PHP options to JS via wp_localize_script
        wp_localize_script('rideloop-planner', 'rideloopData', [
            'apiKey'        => $api_key,
            'defaultLat'    => get_option('rideloop_default_lat', '52.0907'),
            'defaultLng'    => get_option('rideloop_default_lng', '5.1214'),
            'hasApiKey'     => ! empty($api_key),
            'ajaxUrl'       => admin_url('admin-ajax.php'),
            'nonce'         => wp_create_nonce('rideloop_nonce'),
        ]);
    }
}
add_action('wp_enqueue_scripts', 'rideloop_enqueue_assets');


// -------------------------------------------------------------------------
// Admin Settings Page — Settings > RideLoop Settings
// -------------------------------------------------------------------------

/**
 * Register settings menu item under Settings
 */
function rideloop_admin_menu() {
    add_options_page(
        __('RideLoop Settings', 'rideloop'),
        __('RideLoop Settings', 'rideloop'),
        'manage_options',
        'rideloop-settings',
        'rideloop_settings_page'
    );
}
add_action('admin_menu', 'rideloop_admin_menu');

/**
 * Register settings, sections, and fields
 */
function rideloop_register_settings() {
    // Register each option with sanitization
    register_setting('rideloop_settings_group', 'rideloop_google_maps_api_key', [
        'sanitize_callback' => 'sanitize_text_field',
    ]);
    register_setting('rideloop_settings_group', 'rideloop_default_lat', [
        'sanitize_callback' => 'rideloop_sanitize_coordinate',
    ]);
    register_setting('rideloop_settings_group', 'rideloop_default_lng', [
        'sanitize_callback' => 'rideloop_sanitize_coordinate',
    ]);

    // Main settings section
    add_settings_section(
        'rideloop_main_section',
        __('Google Maps Configuration', 'rideloop'),
        'rideloop_main_section_callback',
        'rideloop-settings'
    );

    // API Key field
    add_settings_field(
        'rideloop_google_maps_api_key',
        __('Google Maps API Key', 'rideloop'),
        'rideloop_api_key_field_callback',
        'rideloop-settings',
        'rideloop_main_section'
    );

    // Default center — lat
    add_settings_field(
        'rideloop_default_lat',
        __('Default Map Center (Latitude)', 'rideloop'),
        'rideloop_default_lat_callback',
        'rideloop-settings',
        'rideloop_main_section'
    );

    // Default center — lng
    add_settings_field(
        'rideloop_default_lng',
        __('Default Map Center (Longitude)', 'rideloop'),
        'rideloop_default_lng_callback',
        'rideloop-settings',
        'rideloop_main_section'
    );
}
add_action('admin_init', 'rideloop_register_settings');

/**
 * Sanitize a latitude or longitude coordinate value
 */
function rideloop_sanitize_coordinate($value) {
    $value = floatval($value);
    return $value;
}

/**
 * Section description callback
 */
function rideloop_main_section_callback() {
    echo '<p>' . esc_html__('Enter your Google Maps API key and optional default map location. The API key must have Maps JavaScript API and Places API enabled.', 'rideloop') . '</p>';
}

/**
 * API Key field — rendered as password input for security
 */
function rideloop_api_key_field_callback() {
    $value = get_option('rideloop_google_maps_api_key', '');
    echo '<input type="password" id="rideloop_google_maps_api_key" name="rideloop_google_maps_api_key" value="' . esc_attr($value) . '" class="regular-text" autocomplete="new-password" />';
    echo '<p class="description">' . esc_html__('Required for map display, route planning, and location autocomplete.', 'rideloop') . '</p>';
}

/**
 * Default latitude field
 */
function rideloop_default_lat_callback() {
    $value = get_option('rideloop_default_lat', '52.0907');
    echo '<input type="text" id="rideloop_default_lat" name="rideloop_default_lat" value="' . esc_attr($value) . '" class="small-text" />';
    echo '<p class="description">' . esc_html__('Fallback latitude if geolocation is not available (default: 52.0907 — Utrecht).', 'rideloop') . '</p>';
}

/**
 * Default longitude field
 */
function rideloop_default_lng_callback() {
    $value = get_option('rideloop_default_lng', '5.1214');
    echo '<input type="text" id="rideloop_default_lng" name="rideloop_default_lng" value="' . esc_attr($value) . '" class="small-text" />';
    echo '<p class="description">' . esc_html__('Fallback longitude if geolocation is not available (default: 5.1214 — Utrecht).', 'rideloop') . '</p>';
}

/**
 * Render the settings page
 */
function rideloop_settings_page() {
    if (! current_user_can('manage_options')) {
        return;
    }
?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

        <?php if (isset($_GET['settings-updated'])) : ?>
            <div class="notice notice-success is-dismissible">
                <p><?php esc_html_e('Settings saved successfully.', 'rideloop'); ?></p>
            </div>
        <?php endif; ?>

        <form method="post" action="options.php">
            <?php
            settings_fields('rideloop_settings_group');
            do_settings_sections('rideloop-settings');
            submit_button();
            ?>
        </form>

        <hr>
        <h2><?php esc_html_e('Quick Setup Guide', 'rideloop'); ?></h2>
        <ol>
            <li><?php esc_html_e('Go to Google Cloud Console and create or select a project.', 'rideloop'); ?></li>
            <li><?php esc_html_e('Enable: Maps JavaScript API, Places API, and Directions API.', 'rideloop'); ?></li>
            <li><?php esc_html_e('Create an API key and restrict it to your domain for security.', 'rideloop'); ?></li>
            <li><?php esc_html_e('Paste the key above and save.', 'rideloop'); ?></li>
        </ol>
    </div>
<?php
}


// -------------------------------------------------------------------------
// Helper: Get Planner Page URL
// -------------------------------------------------------------------------

function rideloop_get_planner_url() {
    $planner = get_page_by_path('planner');
    if ($planner) {
        return get_permalink($planner->ID);
    }
    return home_url('/planner/');
}
