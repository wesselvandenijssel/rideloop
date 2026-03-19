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

$has_api_key = ! empty( get_option( 'rideloop_google_maps_api_key', '' ) );
?>

<main id="main-content" class="site-main planner-page" role="main">

    <div class="planner-page__header">
        <div class="container">
            <h1 class="planner-page__title">Route Planner</h1>
            <p class="planner-page__subtitle">Build your perfect round-trip motorcycle loop.</p>
        </div>
    </div>

    <?php if ( ! $has_api_key ) : ?>
    <div class="planner-notice planner-notice--warning">
        <div class="container">
            <p>
                <strong>Setup required:</strong>
                No Google Maps API key is configured.
                <?php if ( current_user_can( 'manage_options' ) ) : ?>
                    <a href="<?php echo esc_url( admin_url( 'options-general.php?page=rideloop-settings' ) ); ?>">Go to RideLoop Settings &rarr;</a>
                <?php endif; ?>
            </p>
        </div>
    </div>
    <?php endif; ?>

    <div class="planner-layout">

        <!-- ---- FORM PANEL ------------------------------------------ -->
        <aside class="planner-panel" role="complementary" aria-label="Route options">

            <!-- Location input lives OUTSIDE the scrollable body.
                 This is required so the PlaceAutocompleteElement suggestions
                 dropdown is not clipped by overflow-y:auto on the panel body. -->
            <div class="planner-location-wrap">
                <label class="form-label" for="planner-start">
                    Starting Location
                    <span class="form-label__required" aria-hidden="true">*</span>
                </label>
                <div class="input-with-btn">
                    <input
                        type="text"
                        id="planner-start"
                        name="start_location"
                        class="form-input"
                        placeholder="Address, city, or landmark..."
                        autocomplete="off"
                    >
                    <button
                        type="button"
                        id="btn-geolocate"
                        class="btn btn--icon"
                        title="Use my current location"
                        aria-label="Use my current location"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                        </svg>
                    </button>
                </div>
                <div id="planner-start-error" class="form-error" role="alert" aria-live="polite" hidden></div>
            </div><!-- .planner-location-wrap -->

            <!-- End-point input — also outside the scrollable body so the autocomplete
                 dropdown is never clipped. Optional: leave blank for a round-trip loop. -->
            <div class="planner-end-wrap">
                <label class="form-label" for="planner-end">
                    End Point
                    <span class="form-label__optional">(optional)</span>
                </label>
                <div class="input-with-btn">
                    <input
                        type="text"
                        id="planner-end"
                        name="end_location"
                        class="form-input"
                        placeholder="Leave blank for a round-trip loop..."
                        autocomplete="off"
                    >
                </div>
                <div id="planner-end-error" class="form-error" role="alert" aria-live="polite" hidden></div>
            </div><!-- .planner-end-wrap -->

            <!-- Scrollable panel body — all other form options + route summary -->
            <div class="planner-panel__body">

                <form id="rideloop-planner-form" class="planner-form" novalidate>

                    <!-- Plan by Time or Distance -->
                    <div class="form-group">
                        <label class="form-label">Plan by</label>
                        <div class="mode-toggle">
                            <label class="mode-btn">
                                <input type="radio" name="plan_mode" value="time" checked>
                                <span>Time</span>
                            </label>
                            <label class="mode-btn">
                                <input type="radio" name="plan_mode" value="distance">
                                <span>Distance</span>
                            </label>
                        </div>
                    </div>

                    <!-- Trip Duration (shown in time mode) -->
                    <div class="form-group" id="duration-group">
                        <label class="form-label" for="planner-duration">Approximate Trip Duration</label>
                        <select id="planner-duration" name="duration" class="form-select">
                            <option value="1h">~1 hour</option>
                            <option value="2h" selected>~2 hours</option>
                            <option value="3h">~3 hours</option>
                            <option value="half-day">Half day (~4–5 hours)</option>
                            <option value="full-day">Full day (~7–8 hours)</option>
                        </select>
                    </div>

                    <!-- Trip Distance (shown in distance mode) -->
                    <div class="form-group" id="distance-group" hidden>
                        <label class="form-label" for="planner-distance">Trip Distance</label>
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
                                placeholder="150"
                            >
                            <span class="input-unit">km</span>
                        </div>
                        <p class="form-hint">Enter the total round-trip distance (20–1200 km).</p>
                    </div>

                    <!-- Road Preference -->
                    <div class="form-group">
                        <fieldset>
                            <legend class="form-label">Road Preference</legend>
                            <div class="radio-group">

                                <label class="radio-label">
                                    <input type="radio" name="road_pref" value="extra-curvy">
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Extra Curvy</strong>
                                        <small>Max turns, tight loops, winding paths</small>
                                    </span>
                                </label>

                                <label class="radio-label">
                                    <input type="radio" name="road_pref" value="twisties" checked>
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Twisties / Scenic</strong>
                                        <small>Backroads with character</small>
                                    </span>
                                </label>

                                <label class="radio-label">
                                    <input type="radio" name="road_pref" value="mixed">
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Mixed</strong>
                                        <small>Balance of fast and scenic</small>
                                    </span>
                                </label>

                                <label class="radio-label">
                                    <input type="radio" name="road_pref" value="highway">
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Highways</strong>
                                        <small>Fast, direct roads</small>
                                    </span>
                                </label>

                            </div>
                        </fieldset>
                    </div>

                    <!-- Scenery / Terrain -->
                    <div class="form-group">
                        <fieldset>
                            <legend class="form-label">Scenery / Terrain</legend>
                            <div class="radio-group">

                                <label class="radio-label">
                                    <input type="radio" name="scenery" value="any" checked>
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Any</strong>
                                        <small>No terrain preference</small>
                                    </span>
                                </label>

                                <label class="radio-label">
                                    <input type="radio" name="scenery" value="forest">
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Forest &amp; Woodland</strong>
                                        <small>Routes through wooded areas</small>
                                    </span>
                                </label>

                                <label class="radio-label">
                                    <input type="radio" name="scenery" value="water">
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Lakes &amp; Rivers</strong>
                                        <small>Follow waterways and coastlines</small>
                                    </span>
                                </label>

                                <label class="radio-label">
                                    <input type="radio" name="scenery" value="heide">
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Heathland (Heide)</strong>
                                        <small>Open heather and moorland</small>
                                    </span>
                                </label>

                                <label class="radio-label">
                                    <input type="radio" name="scenery" value="offroad">
                                    <span class="radio-custom"></span>
                                    <span>
                                        <strong>Offroad &amp; Gravel</strong>
                                        <small>Includes unpaved tracks and gravel paths</small>
                                    </span>
                                </label>

                            </div>
                        </fieldset>
                    </div>

                    <!-- Direction Bias -->
                    <div class="form-group">
                        <label class="form-label">Head towards</label>
                        <div class="direction-picker">
                            <label class="dir-btn">
                                <input type="radio" name="direction" value="any" checked>
                                <span>Any</span>
                            </label>
                            <label class="dir-btn">
                                <input type="radio" name="direction" value="north">
                                <span>N</span>
                            </label>
                            <label class="dir-btn">
                                <input type="radio" name="direction" value="east">
                                <span>E</span>
                            </label>
                            <label class="dir-btn">
                                <input type="radio" name="direction" value="south">
                                <span>S</span>
                            </label>
                            <label class="dir-btn">
                                <input type="radio" name="direction" value="west">
                                <span>W</span>
                            </label>
                        </div>
                    </div>

                    <!-- Avoid Options -->
                    <div class="form-group">
                        <fieldset>
                            <legend class="form-label">Avoid</legend>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="avoid" value="highways" id="avoid-highways">
                                    <span class="checkbox-custom"></span>
                                    Highways / Motorways
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="avoid" value="tolls" id="avoid-tolls">
                                    <span class="checkbox-custom"></span>
                                    Tolls
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="avoid" value="ferries" id="avoid-ferries">
                                    <span class="checkbox-custom"></span>
                                    Ferries
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="avoid" value="unpaved" id="avoid-unpaved" checked>
                                    <span class="checkbox-custom"></span>
                                    Unpaved Roads
                                </label>
                            </div>
                        </fieldset>
                    </div>

                    <!-- Generate Button -->
                    <div class="generate-row">
                        <button
                            type="submit"
                            id="btn-generate"
                            class="btn btn--primary btn--full btn--lg"
                            <?php echo ! $has_api_key ? 'disabled' : ''; ?>
                        >
                            <span class="btn__text">Generate Route</span>
                            <span class="btn__spinner" aria-hidden="true" hidden></span>
                        </button>
                        <button
                            type="button"
                            id="btn-random"
                            class="btn btn--ghost btn--icon-label"
                            title="Generate a route with random settings"
                            aria-label="Random route"
                            <?php echo ! $has_api_key ? 'disabled' : ''; ?>
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                                <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                            </svg>
                            Random
                        </button>
                    </div>

                    <div id="planner-form-error" class="form-error form-error--general" role="alert" aria-live="assertive" hidden></div>

                </form><!-- #rideloop-planner-form -->

                <!-- Route Summary — shown after a route is generated -->
                <div id="route-summary" class="route-summary" hidden aria-live="polite">
                    <h2 class="route-summary__title">Route Summary</h2>
                    <div id="route-filter-tags" class="route-filter-tags"></div>
                    <ul class="route-summary__stats">
                        <li class="route-stat">
                            <span class="route-stat__label">Total Distance</span>
                            <span class="route-stat__value" id="summary-distance">—</span>
                        </li>
                        <li class="route-stat">
                            <span class="route-stat__label">Estimated Time</span>
                            <span class="route-stat__value" id="summary-duration">—</span>
                        </li>
                        <li class="route-stat">
                            <span class="route-stat__label">Waypoints</span>
                            <span class="route-stat__value" id="summary-waypoints">—</span>
                        </li>
                    </ul>

                    <div class="route-summary__waypoints-section">
                        <h3 class="route-summary__section-title">Loop Waypoints</h3>
                        <ol id="waypoint-list" class="waypoint-list"></ol>
                    </div>

                    <a
                        id="btn-open-gmaps"
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn--gmaps btn--full"
                        aria-label="Open this route in Google Maps (opens new tab)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        Open in Google Maps
                    </a>

                    <div class="route-summary__actions">
                        <button id="btn-share" class="btn btn--outline btn--full" type="button" aria-label="Share this route">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                            Share Route
                        </button>
                        <button id="btn-reset" class="btn btn--ghost btn--full" type="button">
                            Start Over
                        </button>
                    </div>

                </div><!-- #route-summary -->

            </div><!-- .planner-panel__body -->

        </aside><!-- .planner-panel -->

        <!-- ---- MAP AREA -------------------------------------------- -->
        <div class="planner-map-area" role="region" aria-label="Route map">
            <div id="map-placeholder" class="map-placeholder" aria-hidden="true">
                <div class="map-placeholder__inner">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <p>
                        <?php echo $has_api_key
                            ? esc_html__( 'Your route will appear here', 'rideloop' )
                            : esc_html__( 'Map unavailable — API key not configured', 'rideloop' );
                        ?>
                    </p>
                </div>
            </div>
            <div id="rideloop-map" class="rideloop-map" aria-label="Interactive route map"></div>
        </div><!-- .planner-map-area -->

    </div><!-- .planner-layout -->

</main>

<?php get_footer(); ?>
