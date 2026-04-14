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
        'footer'  => __('Footer Menu', 'rideloop'),
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

    // Main JS (utilities, nav toggle, hero autocomplete)
    wp_enqueue_script(
        'rideloop-main',
        get_template_directory_uri() . '/assets/js/main.js',
        [],
        $version,
        true // load in footer
    );

    // Only load Leaflet + planner script on the planner page
    if (is_page_template('page-planner.php')) {

        // Leaflet CSS
        wp_enqueue_style(
            'leaflet',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            [],
            '1.9.4'
        );

        // Leaflet JS
        wp_enqueue_script(
            'leaflet',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            [],
            '1.9.4',
            true
        );

        // Planner JS — core route generation + map logic
        wp_enqueue_script(
            'rideloop-planner',
            get_template_directory_uri() . '/assets/js/planner.js',
            ['leaflet'],
            $version,
            true
        );

        // Pass PHP options to JS
        wp_localize_script('rideloop-planner', 'rideloopData', [
            'defaultLat' => get_option('rideloop_default_lat', '52.0907'),
            'defaultLng' => get_option('rideloop_default_lng', '5.1214'),
            'ajaxUrl'    => admin_url('admin-ajax.php'),
            'nonce'      => wp_create_nonce('rideloop_nonce'),
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
    register_setting('rideloop_settings_group', 'rideloop_default_lat', [
        'sanitize_callback' => 'rideloop_sanitize_coordinate',
    ]);
    register_setting('rideloop_settings_group', 'rideloop_default_lng', [
        'sanitize_callback' => 'rideloop_sanitize_coordinate',
    ]);

    // Main settings section
    add_settings_section(
        'rideloop_main_section',
        __('Map Configuration', 'rideloop'),
        'rideloop_main_section_callback',
        'rideloop-settings'
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
    echo '<p>' . esc_html__('Set the default map center shown before a route is generated.', 'rideloop') . '</p>';
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
        <h2><?php esc_html_e('About the Map', 'rideloop'); ?></h2>
        <p><?php esc_html_e('RideLoop uses OpenStreetMap for the map display and OSRM for route calculation — no API key required. The "Open in Google Maps" export button works without a key as well.', 'rideloop'); ?></p>
    </div>
<?php
}


// -------------------------------------------------------------------------
// Helpers: Language-aware page URLs
// -------------------------------------------------------------------------

function rideloop_get_planner_url() {
    $slug = (function_exists('pll_current_language') && pll_current_language() === 'nl')
        ? 'planner'
        : 'plan';

    if (!empty($slug)) {
        return home_url("/{$slug}/");
    }
    return home_url('/');
}

function rideloop_get_contact_url() {
    $slug = ( function_exists( 'pll_current_language' ) && pll_current_language() === 'nl' )
        ? 'contact-nl'
        : 'contact';

    $page = get_page_by_path( $slug );
    if ( $page ) {
        return get_permalink( $page->ID );
    }
    return home_url( "/{$slug}/" );
}
