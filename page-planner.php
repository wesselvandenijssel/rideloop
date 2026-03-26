<?php

/**
 * Template Name: Planner
 *
 * page-planner.php — Full route generation interface.
 *
 * Single-page experience: no reloads. All interactivity is driven by
 * assets/js/planner.js via the Google Maps JS API.
 *
 * Panel structure (important for autocomplete dropdown visibility):
 *   .planner-location-wrap  — sits OUTSIDE the overflow-y:auto container
 *                             so the PlaceAutocompleteElement dropdown is
 *                             never clipped by a scroll ancestor.
 *   .planner-panel__body    — overflow-y:auto; contains all other options.
 */

get_header();

$has_api_key = ! empty(get_option('rideloop_google_maps_api_key', ''));
?>

<main id="main-content" class="site-main planner-page" role="main">

    <?php if (! $has_api_key) : ?>
        <div class="planner-notice planner-notice--warning">
            <div class="container">
                <p>
                    <strong><?php esc_html_e( 'Setup required:', 'rideloop' ); ?></strong>
                    <?php esc_html_e( 'No Google Maps API key is configured.', 'rideloop' ); ?>
                    <?php if (current_user_can('manage_options')) : ?>
                        <a href="<?php echo esc_url(admin_url('options-general.php?page=rideloop-settings')); ?>"><?php esc_html_e( 'Go to RideLoop Settings', 'rideloop' ); ?> &rarr;</a>
                    <?php endif; ?>
                </p>
            </div>
        </div>
    <?php endif; ?>

    <div class="planner-layout">

        <!-- ---- FORM PANEL ------------------------------------------ -->
        <aside class="planner-panel" role="complementary" aria-label="<?php esc_attr_e( 'Route options', 'rideloop' ); ?>">

            <!-- Location input lives OUTSIDE the scrollable body.
                 This is required so the PlaceAutocompleteElement suggestions
                 dropdown is not clipped by overflow-y:auto on the panel body. -->
            <div class="planner-location-wrap">
                <label class="form-label" for="planner-start">
                    <?php esc_html_e( 'Starting Location', 'rideloop' ); ?>
                    <span class="form-label__required" aria-hidden="true">*</span>
                </label>
                <div class="input-with-btn">
                    <input
                        type="text"
                        id="planner-start"
                        name="start_location"
                        class="form-input"
                        placeholder="<?php esc_attr_e( 'Address, city, or landmark...', 'rideloop' ); ?>"
                        autocomplete="off">
                    <button
                        type="button"
                        id="btn-geolocate"
                        class="btn btn--icon"
                        title="<?php esc_attr_e( 'Use my current location', 'rideloop' ); ?>"
                        aria-label="<?php esc_attr_e( 'Use my current location', 'rideloop' ); ?>">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                        </svg>
                    </button>
                </div>
                <div id="planner-start-error" class="form-error" role="alert" aria-live="polite" hidden></div>
            </div><!-- .planner-location-wrap -->

            <!-- End-point input — also outside the scrollable body so the autocomplete
                 dropdown is never clipped. Optional: leave blank for a round-trip loop. -->
            <div class="planner-end-wrap">
                <label class="form-label" for="planner-end">
                    <?php esc_html_e( 'End Point', 'rideloop' ); ?>
                    <span class="form-label__optional"><?php esc_html_e( '(optional)', 'rideloop' ); ?></span>
                </label>
                <div class="input-with-btn">
                    <input
                        type="text"
                        id="planner-end"
                        name="end_location"
                        class="form-input"
                        placeholder="<?php esc_attr_e( 'Leave blank for a round-trip loop...', 'rideloop' ); ?>"
                        autocomplete="off">
                </div>
                <div id="planner-end-error" class="form-error" role="alert" aria-live="polite" hidden></div>
            </div><!-- .planner-end-wrap -->

            <!-- Scrollable panel body — all other form options + route summary -->
            <div class="planner-panel__body">

                <form id="rideloop-planner-form" class="planner-form" novalidate>

                    <!-- Step indicator nav -->
                    <nav class="step-nav" aria-label="<?php esc_attr_e( 'Form steps', 'rideloop' ); ?>">
                        <div class="step-nav__item is-active" data-step="1">
                            <div class="step-nav__num">1</div>
                            <div class="step-nav__label"><?php esc_html_e( 'Distance', 'rideloop' ); ?></div>
                        </div>
                        <div class="step-nav__line" aria-hidden="true"></div>
                        <div class="step-nav__item" data-step="2">
                            <div class="step-nav__num">2</div>
                            <div class="step-nav__label"><?php esc_html_e( 'Roads', 'rideloop' ); ?></div>
                        </div>
                        <div class="step-nav__line" aria-hidden="true"></div>
                        <div class="step-nav__item" data-step="3">
                            <div class="step-nav__num">3</div>
                            <div class="step-nav__label"><?php esc_html_e( 'Details', 'rideloop' ); ?></div>
                        </div>
                    </nav>

                    <!-- Step 1: Distance -->
                    <div class="planner-step is-active" data-step="1">

                        <!-- Plan by Time or Distance -->
                        <div class="form-group">
                            <label class="form-label"><?php esc_html_e( 'Plan by', 'rideloop' ); ?></label>
                            <div class="mode-toggle">
                                <label class="mode-btn">
                                    <input type="radio" name="plan_mode" value="time" checked>
                                    <span><?php esc_html_e( 'Time', 'rideloop' ); ?></span>
                                </label>
                                <label class="mode-btn">
                                    <input type="radio" name="plan_mode" value="distance">
                                    <span><?php esc_html_e( 'Distance', 'rideloop' ); ?></span>
                                </label>
                            </div>
                        </div>

                        <!-- Trip Duration (shown in time mode) -->
                        <div class="form-group" id="duration-group">
                            <label class="form-label" for="planner-duration"><?php esc_html_e( 'Approximate Trip Duration', 'rideloop' ); ?></label>
                            <select id="planner-duration" name="duration" class="form-select">
                                <option value="1h"><?php esc_html_e( '~1 hour', 'rideloop' ); ?></option>
                                <option value="2h" selected><?php esc_html_e( '~2 hours', 'rideloop' ); ?></option>
                                <option value="3h"><?php esc_html_e( '~3 hours', 'rideloop' ); ?></option>
                                <option value="half-day"><?php esc_html_e( 'Half day (~4–5 hours)', 'rideloop' ); ?></option>
                                <option value="full-day"><?php esc_html_e( 'Full day (~7–8 hours)', 'rideloop' ); ?></option>
                            </select>
                        </div>

                        <!-- Trip Distance (shown in distance mode) -->
                        <div class="form-group" id="distance-group" hidden>
                            <label class="form-label" for="planner-distance"><?php esc_html_e( 'Trip Distance', 'rideloop' ); ?></label>
                            <div class="distance-input-wrap">
                                <input
                                    type="number"
                                    id="planner-distance"
                                    name="distance"
                                    class="form-input"
                                    min="20"
                                    max="1200"
                                    step="10"
                                    value="150"
                                    placeholder="150">
                                <span class="input-unit">km</span>
                            </div>
                            <p class="form-hint"><?php esc_html_e( 'Enter the total round-trip distance (20–1200 km).', 'rideloop' ); ?></p>
                        </div>

                        <div class="step-footer">
                            <button type="button" class="btn btn--primary btn--full btn-next"><?php esc_html_e( 'Next', 'rideloop' ); ?> &rarr;</button>
                        </div>

                    </div><!-- step 1 -->

                    <!-- Step 2: Roads -->
                    <div class="planner-step" data-step="2">

                        <!-- Road Preference -->
                        <div class="form-group">
                            <fieldset>
                                <legend class="form-label"><?php esc_html_e( 'Road Preference', 'rideloop' ); ?></legend>
                                <div class="radio-group">

                                    <label class="radio-label">
                                        <input type="radio" name="road_pref" value="extra-curvy">
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Extra Curvy', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'Max turns, tight loops, winding paths', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                    <label class="radio-label">
                                        <input type="radio" name="road_pref" value="twisties" checked>
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Twisties / Scenic', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'Backroads with character', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                    <label class="radio-label">
                                        <input type="radio" name="road_pref" value="mixed">
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Mixed', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'Balance of fast and scenic', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                    <label class="radio-label">
                                        <input type="radio" name="road_pref" value="highway">
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Highways', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'Fast, direct roads', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                </div>
                            </fieldset>
                        </div>

                        <!-- Scenery / Terrain -->
                        <div class="form-group">
                            <fieldset>
                                <legend class="form-label"><?php esc_html_e( 'Scenery / Terrain', 'rideloop' ); ?></legend>
                                <div class="radio-group">

                                    <label class="radio-label">
                                        <input type="radio" name="scenery" value="any" checked>
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Any', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'No terrain preference', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                    <label class="radio-label">
                                        <input type="radio" name="scenery" value="forest">
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Forest &amp; Woodland', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'Routes through wooded areas', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                    <label class="radio-label">
                                        <input type="radio" name="scenery" value="water">
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Lakes &amp; Rivers', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'Follow waterways and coastlines', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                    <label class="radio-label">
                                        <input type="radio" name="scenery" value="heide">
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Heathland (Heide)', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'Open heather and moorland', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                    <label class="radio-label">
                                        <input type="radio" name="scenery" value="offroad">
                                        <span class="radio-custom"></span>
                                        <span>
                                            <strong><?php esc_html_e( 'Offroad &amp; Gravel', 'rideloop' ); ?></strong>
                                            <small><?php esc_html_e( 'Includes unpaved tracks and gravel paths', 'rideloop' ); ?></small>
                                        </span>
                                    </label>

                                </div>
                            </fieldset>
                        </div>

                        <div class="step-footer">
                            <button type="button" class="btn btn--ghost btn-back">&larr; <?php esc_html_e( 'Back', 'rideloop' ); ?></button>
                            <button type="button" class="btn btn--primary btn-next"><?php esc_html_e( 'Next', 'rideloop' ); ?> &rarr;</button>
                        </div>

                    </div><!-- step 2 -->

                    <!-- Step 3: Details + Generate -->
                    <div class="planner-step" data-step="3">

                        <!-- Direction Bias -->
                        <div class="form-group">
                            <label class="form-label"><?php esc_html_e( 'Head towards', 'rideloop' ); ?></label>
                            <div class="direction-picker">
                                <label class="dir-btn">
                                    <input type="radio" name="direction" value="any" checked>
                                    <span><?php esc_html_e( 'Any', 'rideloop' ); ?></span>
                                </label>
                                <label class="dir-btn">
                                    <input type="radio" name="direction" value="north">
                                    <span><?php esc_html_e( 'N', 'rideloop' ); ?></span>
                                </label>
                                <label class="dir-btn">
                                    <input type="radio" name="direction" value="east">
                                    <span><?php esc_html_e( 'E', 'rideloop' ); ?></span>
                                </label>
                                <label class="dir-btn">
                                    <input type="radio" name="direction" value="south">
                                    <span><?php esc_html_e( 'S', 'rideloop' ); ?></span>
                                </label>
                                <label class="dir-btn">
                                    <input type="radio" name="direction" value="west">
                                    <span><?php esc_html_e( 'W', 'rideloop' ); ?></span>
                                </label>
                            </div>
                        </div>

                        <!-- Avoid Options -->
                        <div class="form-group">
                            <fieldset>
                                <legend class="form-label"><?php esc_html_e( 'Avoid', 'rideloop' ); ?></legend>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="avoid" value="highways" id="avoid-highways">
                                        <span class="checkbox-custom"></span>
                                        <?php esc_html_e( 'Highways / Motorways', 'rideloop' ); ?>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="avoid" value="tolls" id="avoid-tolls">
                                        <span class="checkbox-custom"></span>
                                        <?php esc_html_e( 'Tolls', 'rideloop' ); ?>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="avoid" value="ferries" id="avoid-ferries">
                                        <span class="checkbox-custom"></span>
                                        <?php esc_html_e( 'Ferries', 'rideloop' ); ?>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="avoid" value="unpaved" id="avoid-unpaved" checked>
                                        <span class="checkbox-custom"></span>
                                        <?php esc_html_e( 'Unpaved Roads', 'rideloop' ); ?>
                                    </label>
                                </div>
                            </fieldset>
                        </div>

                        <!-- Generate Button -->
                        <div class="generate-row">
                            <button type="button" class="btn btn--ghost btn-back">&larr; <?php esc_html_e( 'Back', 'rideloop' ); ?></button>
                            <button
                                type="submit"
                                id="btn-generate"
                                class="btn btn--primary btn--lg"
                                <?php echo ! $has_api_key ? 'disabled' : ''; ?>>
                                <span class="btn__text"><?php esc_html_e( 'Generate Route', 'rideloop' ); ?></span>
                                <span class="btn__spinner" aria-hidden="true" hidden></span>
                            </button>
                            <button
                                type="button"
                                id="btn-random"
                                class="btn btn--ghost btn--icon-label"
                                title="<?php esc_attr_e( 'Generate a route with random settings', 'rideloop' ); ?>"
                                aria-label="<?php esc_attr_e( 'Random route', 'rideloop' ); ?>"
                                <?php echo ! $has_api_key ? 'disabled' : ''; ?>>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                    <polyline points="16 3 21 3 21 8" />
                                    <line x1="4" y1="20" x2="21" y2="3" />
                                    <polyline points="21 16 21 21 16 21" />
                                    <line x1="15" y1="15" x2="21" y2="21" />
                                </svg>
                                <?php esc_html_e( 'Random', 'rideloop' ); ?>
                            </button>
                        </div>

                    </div><!-- step 3 -->

                    <div id="planner-form-error" class="form-error form-error--general" role="alert" aria-live="assertive" hidden></div>

                </form><!-- #rideloop-planner-form -->

                <!-- Route Summary — shown after a route is generated -->
                <div id="route-summary" class="route-summary" hidden aria-live="polite">
                    <h2 class="route-summary__title"><?php esc_html_e( 'Route Summary', 'rideloop' ); ?></h2>
                    <div id="route-filter-tags" class="route-filter-tags"></div>
                    <ul class="route-summary__stats">
                        <li class="route-stat">
                            <span class="route-stat__label"><?php esc_html_e( 'Total Distance', 'rideloop' ); ?></span>
                            <span class="route-stat__value" id="summary-distance">—</span>
                        </li>
                        <li class="route-stat">
                            <span class="route-stat__label"><?php esc_html_e( 'Estimated Time', 'rideloop' ); ?></span>
                            <span class="route-stat__value" id="summary-duration">—</span>
                        </li>
                        <li class="route-stat">
                            <span class="route-stat__label"><?php esc_html_e( 'Waypoints', 'rideloop' ); ?></span>
                            <span class="route-stat__value" id="summary-waypoints">—</span>
                        </li>
                    </ul>

                    <!-- Weather -->
                    <div id="weather-section" class="route-summary__weather" hidden>
                        <div id="weather-content" class="weather-card"></div>
                    </div>

                    <div class="route-summary__waypoints-section">
                        <h3 class="route-summary__section-title"><?php esc_html_e( 'Loop Waypoints', 'rideloop' ); ?></h3>
                        <ol id="waypoint-list" class="waypoint-list"></ol>
                    </div>

                    <!-- Elevation profile -->
                    <div id="elevation-section" class="route-summary__elevation" hidden>
                        <h3 class="route-summary__section-title"><?php esc_html_e( 'Elevation Profile', 'rideloop' ); ?></h3>
                        <div class="elevation-chart-wrap">
                            <svg id="elevation-chart" class="elevation-chart" preserveAspectRatio="none" aria-hidden="true"></svg>
                        </div>
                        <div class="elevation-stats">
                            <span class="elevation-stat"><span class="elevation-stat__label"><?php esc_html_e( 'Low', 'rideloop' ); ?></span> <span id="elevation-min" class="elevation-stat__value">—</span></span>
                            <span class="elevation-stat"><span class="elevation-stat__label"><?php esc_html_e( 'High', 'rideloop' ); ?></span> <span id="elevation-max" class="elevation-stat__value">—</span></span>
                        </div>
                    </div>

                    <div id="poi-section" class="route-summary__poi-section" hidden>
                        <h3 class="route-summary__section-title"><?php esc_html_e( 'Points of Interest', 'rideloop' ); ?></h3>
                        <ul id="poi-list" class="poi-list"></ul>
                    </div>

                    <a
                        id="btn-open-gmaps"
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn--gmaps btn--full"
                        aria-label="<?php esc_attr_e( 'Open this route in Google Maps (opens new tab)', 'rideloop' ); ?>">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <?php esc_html_e( 'Open in Google Maps', 'rideloop' ); ?>
                    </a>

                    <div id="gmaps-tip" class="gmaps-tip" hidden></div>

                    <div class="route-summary__actions">
                        <button id="btn-share" class="btn btn--outline btn--full" type="button" aria-label="<?php esc_attr_e( 'Share this route', 'rideloop' ); ?>">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                            <?php esc_html_e( 'Share Route', 'rideloop' ); ?>
                        </button>
                        <button id="btn-reset" class="btn btn--ghost btn--full" type="button">
                            <?php esc_html_e( 'Start Over', 'rideloop' ); ?>
                        </button>
                    </div>

                </div><!-- #route-summary -->

            </div><!-- .planner-panel__body -->

        </aside><!-- .planner-panel -->

        <!-- ---- MAP AREA -------------------------------------------- -->
        <div class="planner-map-area" role="region" aria-label="<?php esc_attr_e( 'Route map', 'rideloop' ); ?>">
            <div id="map-placeholder" class="map-placeholder" aria-hidden="true">
                <div class="map-placeholder__inner">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <p>
                        <?php echo $has_api_key
                            ? esc_html__('Your route will appear here', 'rideloop')
                            : esc_html__('Map unavailable — API key not configured', 'rideloop');
                        ?>
                    </p>
                </div>
            </div>
            <div id="rideloop-map" class="rideloop-map" aria-label="<?php esc_attr_e( 'Interactive route map', 'rideloop' ); ?>"></div>
        </div><!-- .planner-map-area -->

    </div><!-- .planner-layout -->

</main>

<?php get_footer(); ?>
