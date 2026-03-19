/**
 * planner.js — RideLoop Route Planner
 *
 * Handles all client-side route generation logic:
 *  - Google Maps initialization (callback: rideloopInitMap)
 *  - Google Places autocomplete on the start location input
 *  - Browser Geolocation API for current-location button
 *  - Route generation via Google Maps Directions Service
 *  - Waypoint strategy based on duration + road preference
 *  - Route display via Directions Renderer
 *  - Route summary (distance, time, waypoints)
 *  - "Open in Google Maps" URL export
 *
 * Loaded BEFORE the Google Maps JS API script so the `rideloopInitMap`
 * callback is defined when the API fires it.
 *
 * PHP passes `rideloopData` via wp_localize_script:
 *  - rideloopData.apiKey
 *  - rideloopData.defaultLat
 *  - rideloopData.defaultLng
 *  - rideloopData.hasApiKey
 */

/* global google, rideloopData */

( function () {
  'use strict';

  // -----------------------------------------------------------------------
  // State — holds the active route data for export
  // -----------------------------------------------------------------------
  const state = {
    map:              null,
    directionsService: null,
    directionsRenderer: null,
    autocomplete:     null,
    startLatLng:      null,  // google.maps.LatLng of the chosen start
    startAddress:     '',    // human-readable address string
    currentRoute:     null,  // last DirectionsResult
    waypointLatLngs:  [],    // array of google.maps.LatLng used as waypoints
  };

  // -----------------------------------------------------------------------
  // DOM refs — cached once the DOM is ready
  // -----------------------------------------------------------------------
  let dom = {};

  function cacheDom() {
    dom = {
      form:            document.getElementById( 'rideloop-planner-form' ),
      startInput:      document.getElementById( 'planner-start' ),
      planModeRadios:  document.querySelectorAll( 'input[name="plan_mode"]' ),
      durationGroup:   document.getElementById( 'duration-group' ),
      distanceGroup:   document.getElementById( 'distance-group' ),
      durationSelect:  document.getElementById( 'planner-duration' ),
      distanceInput:   document.getElementById( 'planner-distance' ),
      roadPrefRadios:  document.querySelectorAll( 'input[name="road_pref"]' ),
      sceneryRadios:   document.querySelectorAll( 'input[name="scenery"]' ),
      directionRadios: document.querySelectorAll( 'input[name="direction"]' ),
      avoidHighways:   document.getElementById( 'avoid-highways' ),
      avoidTolls:      document.getElementById( 'avoid-tolls' ),
      avoidFerries:    document.getElementById( 'avoid-ferries' ),
      avoidUnpaved:    document.getElementById( 'avoid-unpaved' ),
      btnGenerate:     document.getElementById( 'btn-generate' ),
      btnRandom:       document.getElementById( 'btn-random' ),
      btnGeolocate:    document.getElementById( 'btn-geolocate' ),
      btnOpenGmaps:    document.getElementById( 'btn-open-gmaps' ),
      btnReset:        document.getElementById( 'btn-reset' ),
      formError:       document.getElementById( 'planner-form-error' ),
      startError:      document.getElementById( 'planner-start-error' ),
      routeSummary:    document.getElementById( 'route-summary' ),
      summaryDistance: document.getElementById( 'summary-distance' ),
      summaryDuration: document.getElementById( 'summary-duration' ),
      summaryWaypoints: document.getElementById( 'summary-waypoints' ),
      filterTags:      document.getElementById( 'route-filter-tags' ),
      waypointList:    document.getElementById( 'waypoint-list' ),
      mapDiv:          document.getElementById( 'rideloop-map' ),
      mapPlaceholder:  document.getElementById( 'map-placeholder' ),
    };
  }

  // -----------------------------------------------------------------------
  // rideloopInitMap — Google Maps API callback
  //
  // Called automatically by the Google Maps JS API once loaded.
  // Initializes the map, Directions Service/Renderer, Places autocomplete,
  // and all event listeners.
  // -----------------------------------------------------------------------
  window.rideloopInitMap = function () {
    cacheDom();

    if ( ! dom.mapDiv ) return; // not on planner page

    // Default center from PHP options (fallback: Utrecht, Netherlands)
    const defaultCenter = {
      lat: parseFloat( rideloopData.defaultLat || 52.0907 ),
      lng: parseFloat( rideloopData.defaultLng || 5.1214 ),
    };

    // ---- Initialize Map ----
    state.map = new google.maps.Map( dom.mapDiv, {
      center:            defaultCenter,
      zoom:              7,
      mapTypeId:         google.maps.MapTypeId.ROADMAP,
      disableDefaultUI:  false,
      zoomControl:       true,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling:   'cooperative',
      styles: [
        // Subtle style to de-emphasize POI clutter and keep focus on roads
        { featureType: 'poi', stylers: [ { visibility: 'off' } ] },
        { featureType: 'transit', stylers: [ { visibility: 'simplified' } ] },
      ],
    } );

    // Hide placeholder once map canvas is ready
    google.maps.event.addListenerOnce( state.map, 'idle', function () {
      if ( dom.mapPlaceholder ) {
        dom.mapPlaceholder.classList.add( 'hidden' );
      }
    } );

    // ---- Directions Service & Renderer ----
    state.directionsService  = new google.maps.DirectionsService();
    state.directionsRenderer = new google.maps.DirectionsRenderer( {
      map:              state.map,
      suppressMarkers:  false,
      polylineOptions: {
        strokeColor:   '#FF6B00',
        strokeWeight:  5,
        strokeOpacity: 0.85,
      },
    } );

    // ---- Places Autocomplete (new PlaceAutocompleteElement API) ----
    // google.maps.places.Autocomplete is unavailable to accounts created after
    // March 1 2025. We use PlaceAutocompleteElement (a web component) instead.
    initPlaceAutocomplete();

    // ---- Geolocation button ----
    if ( dom.btnGeolocate ) {
      dom.btnGeolocate.addEventListener( 'click', handleGeolocate );
    }

    // ---- Form submit ----
    if ( dom.form ) {
      dom.form.addEventListener( 'submit', handleFormSubmit );
    }

    // ---- Plan mode toggle (Time / Distance) ----
    dom.planModeRadios.forEach( function ( r ) {
      r.addEventListener( 'change', handleModeToggle );
    } );

    // ---- Random route button ----
    if ( dom.btnRandom ) {
      dom.btnRandom.addEventListener( 'click', handleRandom );
    }

    // ---- Reset button ----
    if ( dom.btnReset ) {
      dom.btnReset.addEventListener( 'click', handleReset );
    }

    // Note: geolocation is NOT triggered automatically on load.
    // The GPS button (btn-geolocate) handles on-demand location requests.
    // Auto-prompting caused the browser permission spinner to appear before
    // the page finished rendering, which confused users.
  };

  // -----------------------------------------------------------------------
  // PlaceAutocompleteElement Setup
  // -----------------------------------------------------------------------

  /**
   * Replace the legacy text input with google.maps.places.PlaceAutocompleteElement.
   *
   * The old google.maps.places.Autocomplete class is unavailable to API projects
   * created after March 1 2025. PlaceAutocompleteElement is the current API and
   * renders as a <gmp-place-autocomplete> web component with its own internal input.
   *
   * Strategy:
   *  - Create the element and insert it into .input-with-btn before the original input
   *  - Hide the original input (keep it in DOM for error messaging anchor)
   *  - Listen for 'gmp-placeselect' to capture LatLng when a suggestion is chosen
   *  - On input change, reset startLatLng so form submit falls back to geocoding
   */
  function initPlaceAutocomplete() {
    if ( ! google.maps.places.PlaceAutocompleteElement ) {
      // Fallback: PlaceAutocompleteElement not available — leave original input visible
      // and rely entirely on geocoding at form-submit time.
      console.warn( 'RideLoop: PlaceAutocompleteElement unavailable, using raw geocoding fallback.' );
      return;
    }

    // Create the web component.
    // No `types` restriction — mixing 'geocode' + 'establishment' can silently
    // suppress suggestions with the new Places API. Leaving it unset returns
    // all place types (addresses, businesses, cities) which is what we want.
    const placeAutoEl = new google.maps.places.PlaceAutocompleteElement();
    placeAutoEl.id          = 'planner-start-autocomplete';
    placeAutoEl.placeholder = 'Address, city, or landmark...';

    // Insert into the flex row, pushing the original input out of view
    const wrapper = dom.startInput.closest( '.input-with-btn' );
    wrapper.insertBefore( placeAutoEl, dom.startInput );
    dom.startInput.hidden         = true;
    dom.startInput.required       = false; // prevent browser validation on hidden field
    dom.startInput.value          = '';

    // Store element ref so form submit can read its current text
    state.autocompleteEl = placeAutoEl;

    // When the user selects a suggestion, fetch the place details
    placeAutoEl.addEventListener( 'gmp-placeselect', async function ( event ) {
      const place = event.place;
      try {
        await place.fetchFields( { fields: [ 'displayName', 'formattedAddress', 'location' ] } );
        state.startLatLng  = place.location;
        state.startAddress = place.formattedAddress || place.displayName?.text || '';
        // Sync to hidden input so our existing error-clearing logic works
        dom.startInput.value = state.startAddress;
        clearError( dom.startError );
      } catch ( err ) {
        state.startLatLng = null;
        showError( dom.startError, 'Could not load place details — try selecting again.' );
      }
    } );

    // When the user edits the text after selecting, invalidate the stored LatLng.
    // The form-submit handler will geocode the raw text instead.
    placeAutoEl.addEventListener( 'input', function () {
      state.startLatLng  = null;
      state.startAddress = '';
    } );

    // Pre-fill from ?start_location= URL param (passed from the hero form).
    // Must run here — after the element exists — because the Maps API loads async.
    const urlParams   = new URLSearchParams( window.location.search );
    const startParam  = urlParams.get( 'start_location' );
    if ( startParam ) {
      const decoded = decodeURIComponent( startParam );
      placeAutoEl.value    = decoded;
      dom.startInput.value = decoded;
    }
  }

  // -----------------------------------------------------------------------
  // Geolocation Handlers
  // -----------------------------------------------------------------------

  /**
   * Explicit geolocation triggered by the GPS button.
   * Fills the start input and sets startLatLng.
   */
  function handleGeolocate() {
    if ( ! navigator.geolocation ) {
      showError( dom.startError, 'Geolocation is not supported by your browser.' );
      return;
    }

    dom.btnGeolocate.disabled = true;
    dom.btnGeolocate.setAttribute( 'aria-label', 'Detecting location...' );

    navigator.geolocation.getCurrentPosition(
      function ( position ) {
        const latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Reverse-geocode to get a human-readable address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode( { location: latlng }, function ( results, status ) {
          dom.btnGeolocate.disabled = false;
          dom.btnGeolocate.setAttribute( 'aria-label', 'Use my current location' );

          if ( status === 'OK' && results[0] ) {
            const address = results[0].formatted_address;
            // Populate whichever input is active
            if ( state.autocompleteEl ) state.autocompleteEl.value = address;
            else dom.startInput.value = address;
            state.startLatLng     = new google.maps.LatLng( latlng.lat, latlng.lng );
            state.startAddress    = address;
            state.map.setCenter( state.startLatLng );
            state.map.setZoom( 10 );
          } else {
            // Fallback: just use raw coordinates as address
            dom.startInput.value  = latlng.lat.toFixed( 5 ) + ', ' + latlng.lng.toFixed( 5 );
            state.startLatLng     = new google.maps.LatLng( latlng.lat, latlng.lng );
            state.startAddress    = dom.startInput.value;
          }
        } );
      },
      function ( err ) {
        dom.btnGeolocate.disabled = false;
        dom.btnGeolocate.setAttribute( 'aria-label', 'Use my current location' );
        const msgs = {
          1: 'Location access was denied. Please allow it in your browser settings.',
          2: 'Location unavailable. Try entering your address manually.',
          3: 'Location request timed out. Try again.',
        };
        showError( dom.startError, msgs[ err.code ] || 'Could not get your location.' );
      },
      { timeout: 10000, maximumAge: 30000 }
    );
  }

  // -----------------------------------------------------------------------
  // Form Submit Handler
  // -----------------------------------------------------------------------

  function handleFormSubmit( e ) {
    e.preventDefault();
    clearAllErrors();

    // ---- Validate start location ----
    // Read from PlaceAutocompleteElement if active, otherwise from the original input
    const rawInput = (
      state.autocompleteEl ? state.autocompleteEl.value : dom.startInput.value
    ).trim();

    if ( ! rawInput ) {
      showError( dom.startError, 'Please enter a starting location.' );
      if ( state.autocompleteEl ) state.autocompleteEl.focus();
      else dom.startInput.focus();
      return;
    }

    // If startLatLng is null (user typed but didn't pick from autocomplete),
    // geocode the raw text before proceeding.
    if ( ! state.startLatLng ) {
      setLoading( true );
      geocodeAddress( rawInput, function ( latlng, address ) {
        if ( ! latlng ) {
          setLoading( false );
          showError( dom.startError, 'Could not find that location. Please try a more specific address.' );
          return;
        }
        state.startLatLng  = latlng;
        state.startAddress = address || rawInput;
        generateRoute();
      } );
    } else {
      generateRoute();
    }
  }

  // -----------------------------------------------------------------------
  // Geocoding Helper
  // -----------------------------------------------------------------------

  function geocodeAddress( address, callback ) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode( { address: address }, function ( results, status ) {
      if ( status === 'OK' && results[0] ) {
        callback(
          results[0].geometry.location,
          results[0].formatted_address
        );
      } else {
        callback( null, null );
      }
    } );
  }

  // -----------------------------------------------------------------------
  // Route Generation — Core Logic
  //
  // Strategy:
  //   1. Calculate a target loop radius based on trip duration
  //      (average motorcycle speed ~50 mph on scenic, ~65 mph on highway)
  //   2. Generate 2–4 waypoints offset from the start at cardinal/diagonal
  //      angles to form a rough loop shape
  //   3. Adjust waypoint distance based on road preference:
  //      - Twisties: shorter radius, more waypoints, avoid highways
  //      - Highway: larger radius, fewer waypoints, prefer highways
  //      - Mixed: balanced
  //   4. Request a round-trip route (origin = destination = start)
  //      with the computed waypoints via Directions Service
  // -----------------------------------------------------------------------

  async function generateRoute() {
    setLoading( true );
    clearRouteSummary();

    const duration  = dom.durationSelect.value;
    const roadPref  = getSelectedRadio( dom.roadPrefRadios );
    const scenery   = getSelectedRadio( dom.sceneryRadios );

    // ---- Calculate total route distance ----
    const planMode = getSelectedRadio( dom.planModeRadios );

    let totalKm;
    if ( planMode === 'distance' ) {
      // Distance mode: user entered a km value directly
      const rawKm = dom.distanceInput ? parseFloat( dom.distanceInput.value ) : NaN;
      if ( ! rawKm || rawKm < 20 || rawKm > 1200 ) {
        setLoading( false );
        showError( dom.formError, 'Enter a distance between 20 and 1200 km.' );
        return;
      }
      totalKm = rawKm;
    } else {
      // Time mode: distance = speed × hours
      const durationHours = durationToHours( duration );
      const speedMap = {
        'extra-curvy': 50,
        'twisties':    60,
        'mixed':       75,
        'highway':     100,
      };
      totalKm = ( speedMap[ roadPref ] || 65 ) * durationHours;
    }

    // Loop radius — the circle on which all waypoints sit.
    //
    // With the new loop model, start is ON the circle (not the center).
    // Total road distance ≈ (n+1) × 2r × sin(π/(n+1)) × meander.
    // Factors derived from that formula with meander ≈ 1.4–1.8.
    const waypointCounts = {
      'extra-curvy': 5,   // hexagon (6 legs)
      'twisties':    4,   // pentagon (5 legs)
      'mixed':       3,   // square   (4 legs)
      'highway':     2,   // triangle (3 legs)
    };
    const loopCount = waypointCounts[ roadPref ] || 4;

    const reachFactors = {
      'extra-curvy': 0.10,
      'twisties':    0.11,
      'mixed':       0.13,
      'highway':     0.16,
    };
    const reachKm = totalKm * ( reachFactors[ roadPref ] || 0.12 );

    // ---- Build base waypoints ----
    const dirBearingMap = { north: 0, east: 90, south: 180, west: 270 };
    const direction     = getSelectedRadio( dom.directionRadios );
    const dirBearing    = ( direction === 'any' ) ? null : ( dirBearingMap[ direction ] ?? null );

    let waypointLatLngs = buildLoopWaypoints( state.startLatLng, reachKm, dirBearing, loopCount );

    // ---- Scenery waypoint ----
    // For offroad, allow unpaved roads automatically.
    if ( scenery === 'offroad' && dom.avoidUnpaved ) {
      dom.avoidUnpaved.checked = false;
    }

    // Search for a natural-area POI near the route tip and insert it as an
    // extra stopover so Google must route through that type of terrain.
    if ( scenery !== 'any' ) {
      const tipIdx      = Math.floor( waypointLatLngs.length / 2 );
      const searchCenter = waypointLatLngs[ tipIdx ] || state.startLatLng;
      const searchRadiusM = reachKm * 1500; // 1.5× reach radius in metres

      const sceneryLatlng = await findSceneryWaypoint( scenery, searchCenter, searchRadiusM );
      if ( sceneryLatlng ) {
        // Insert the scenery POI at the tip of the loop so the route passes through it.
        // Max 8 waypoints total — inserting 1 extra into max-6 is safe.
        waypointLatLngs.splice( tipIdx, 0, sceneryLatlng );
      }
    }

    state.waypointLatLngs = waypointLatLngs;

    // ---- Build Directions request ----
    // avoidHighways is driven entirely by the user's checkbox.
    // Previously we auto-enabled it for scenic preferences, but combined with
    // stopover:true it causes a 3× meander penalty that makes routes far too long.
    // Scenic variety is achieved through waypoint count and placement instead.
    const request = {
      origin:            state.startLatLng,
      destination:       state.startLatLng,
      waypoints:         waypointLatLngs.map( function ( latlng ) {
        return { location: latlng, stopover: true };
      } ),
      optimizeWaypoints: false,
      travelMode:        google.maps.TravelMode.DRIVING,
      avoidHighways:     dom.avoidHighways ? dom.avoidHighways.checked : false,
      avoidTolls:        dom.avoidTolls   ? dom.avoidTolls.checked   : false,
      avoidFerries:      dom.avoidFerries ? dom.avoidFerries.checked  : false,
    };

    // ---- Call Directions Service (with automatic retry on ZERO_RESULTS) ----
    requestDirections( request, waypointLatLngs, 0 );
  }

  /**
   * Execute a Directions request and retry with looser constraints if ZERO_RESULTS.
   *
   * Retry sequence (retryLevel):
   *   0 — full preferences (avoidHighways, all waypoints)
   *   1 — drop avoidHighways, keep waypoints
   *   2 — drop avoidHighways + reduce to 2 waypoints (opposite corners of the loop)
   *
   * This handles the common case where avoidHighways combined with multiple
   * waypoints produces an impossible route (e.g. waypoints across water).
   *
   * @param {google.maps.DirectionsRequest} request
   * @param {google.maps.LatLng[]} waypointLatLngs
   * @param {number} retryLevel
   */
  function requestDirections( request, waypointLatLngs, retryLevel ) {
    state.directionsService.route( request, function ( result, status ) {

      if ( status === google.maps.DirectionsStatus.OK ) {
        setLoading( false );
        state.currentRoute = result;
        displayRoute( result );
        displaySummary( result, waypointLatLngs );
        buildGoogleMapsUrl( result );
        return;
      }

      // ---- Auto-retry on ZERO_RESULTS ----
      if ( status === 'ZERO_RESULTS' && retryLevel < 2 ) {
        var nextRequest = Object.assign( {}, request );

        if ( retryLevel === 0 ) {
          // Retry 1: drop avoidHighways — maybe the waypoints require a highway crossing
          nextRequest.avoidHighways = false;
        } else if ( retryLevel === 1 ) {
          // Retry 2: reduce to 2 waypoints (opposite corners only) and no highway avoidance
          var reduced = [
            waypointLatLngs[ 0 ],
            waypointLatLngs[ Math.floor( waypointLatLngs.length / 2 ) ],
          ];
          nextRequest.waypoints      = reduced.map( function ( latlng ) {
            return { location: latlng, stopover: true };
          } );
          nextRequest.avoidHighways  = false;
          waypointLatLngs            = reduced; // update for summary display
        }

        requestDirections( nextRequest, waypointLatLngs, retryLevel + 1 );
        return;
      }

      // ---- All retries exhausted — show a descriptive error ----
      setLoading( false );
      var errorMessages = {
        NOT_FOUND:              'Location not found. Try a different starting point.',
        ZERO_RESULTS:           'No route found. Your location may have limited road access — try a nearby town or a longer trip duration.',
        MAX_WAYPOINTS_EXCEEDED: 'Too many waypoints. Try a shorter trip duration.',
        REQUEST_DENIED:         'Request denied — check that your API key has the Directions API enabled.',
        OVER_DAILY_LIMIT:       'API quota exceeded. Check your Google Cloud billing.',
        OVER_QUERY_LIMIT:       'Too many requests. Wait a moment and try again.',
        UNKNOWN_ERROR:          'Unexpected error. Please try again.',
      };
      var msg = errorMessages[ status ] || 'Route generation failed (status: ' + status + ').';
      showError( dom.formError, msg );
    } );
  }

  // -----------------------------------------------------------------------
  // Waypoint Geometry Helpers
  // -----------------------------------------------------------------------

  /**
   * Build waypoints for a geometrically correct closed loop.
   *
   * KEY IDEA — start ON the circle, not at the center:
   *   The loop circle's center is placed `radiusKm` away from the start in
   *   `dirBearing` (or a random direction when null). The start sits on the
   *   circle's far edge. The n waypoints fill the remaining arc, equally
   *   spaced, so every leg — including the first and last — covers the same
   *   arc length. This guarantees:
   *     • No two legs share the same approach roads near the start.
   *     • The route genuinely bulges toward the chosen compass direction.
   *     • "Any" direction produces a full circular loop in a random direction
   *       (different each time Generate is pressed).
   *
   * Geometry (n waypoints, n+1 equal arcs):
   *   angleStep = 360 / (n+1)
   *   start     = loopCenter + r @ (dirBearing + 180°)   ← diametrically opposite
   *   WPk       = loopCenter + r @ (start_angle + k × angleStep)
   *
   * @param {google.maps.LatLng} start       - Start/end point of the ride
   * @param {number}             radiusKm    - Loop circle radius in km
   * @param {number|null}        dirBearing  - Bearing for loop center (0=N…) or null=random
   * @param {number}             count       - Number of intermediate waypoints
   * @returns {google.maps.LatLng[]}
   */
  function buildLoopWaypoints( start, radiusKm, dirBearing, count ) {
    // Place the loop center in the direction of travel.
    // null → random bearing so every "Any" generate produces a different loop.
    const loopBearing = ( dirBearing !== null ) ? dirBearing : Math.floor( Math.random() * 360 );
    const loopCenter  = offsetLatLng( start, radiusKm, loopBearing );

    // start is diametrically opposite the center on the circle.
    // Divide 360° into (count + 1) equal arcs; waypoints fill arcs 1…count.
    const totalPoints = count + 1;
    const angleStep   = 360 / totalPoints;

    // First waypoint is one arc-step clockwise from the start's position.
    const startPos   = ( loopBearing + 180 ) % 360;  // where start sits on circle
    const firstAngle = ( startPos + angleStep ) % 360;

    const points = [];
    for ( let i = 0; i < count; i++ ) {
      const angle = ( firstAngle + i * angleStep ) % 360;
      points.push( offsetLatLng( loopCenter, radiusKm, angle ) );
    }
    return points;
  }

  /**
   * Search for a natural-area POI matching the requested scenery type.
   * Returns a LatLng to insert as an extra waypoint, or null if nothing found.
   *
   * Tries Place.searchByText() (new Places API, post-March 2025 keys) first,
   * then falls back to the legacy PlacesService.textSearch().
   *
   * @param {string}             scenery       - "forest"|"water"|"heide"|"offroad"
   * @param {google.maps.LatLng} searchCenter  - Centre of the search area (route tip)
   * @param {number}             radiusM       - Search radius in metres
   * @returns {Promise<google.maps.LatLng|null>}
   */
  async function findSceneryWaypoint( scenery, searchCenter, radiusM ) {
    const queryMap = {
      forest:  'forest bos woodland nature reserve',
      water:   'lake meer river rivier coast waterway',
      heide:   'heide heathland moorland heideveld',
      offroad: 'mountain bike trail gravel path nature trail',
    };
    const textQuery = queryMap[ scenery ];
    if ( ! textQuery ) return null;

    // --- New Places API (Place.searchByText) ---
    if (
      google.maps.places &&
      google.maps.places.Place &&
      typeof google.maps.places.Place.searchByText === 'function'
    ) {
      try {
        const { places } = await google.maps.places.Place.searchByText( {
          textQuery,
          fields:         [ 'location', 'displayName' ],
          locationBias:   { center: searchCenter, radius: radiusM },
          maxResultCount: 5,
        } );
        if ( places && places.length > 0 && places[ 0 ].location ) {
          return places[ 0 ].location;
        }
      } catch ( err ) {
        console.warn( 'RideLoop: Place.searchByText failed, trying fallback.', err );
      }
    }

    // --- Fallback: legacy PlacesService.textSearch ---
    if ( google.maps.places && google.maps.places.PlacesService ) {
      return new Promise( function ( resolve ) {
        const svc = new google.maps.places.PlacesService( state.map );
        svc.textSearch(
          { query: textQuery, location: searchCenter, radius: radiusM },
          function ( results, status ) {
            if ( status === 'OK' && results && results[ 0 ] ) {
              resolve( results[ 0 ].geometry.location );
            } else {
              resolve( null );
            }
          }
        );
      } );
    }

    return null;
  }

  /**
   * Offset a LatLng by `distanceKm` kilometres in the given `bearingDeg`.
   * Uses the spherical Earth approximation (good to <0.5% for distances <1000km).
   *
   * @param {google.maps.LatLng} origin      - Starting point
   * @param {number}             distanceKm  - Distance to travel
   * @param {number}             bearingDeg  - Compass bearing in degrees (0=N, 90=E, ...)
   * @returns {google.maps.LatLng}
   */
  function offsetLatLng( origin, distanceKm, bearingDeg ) {
    const R       = 6371; // Earth radius in km
    const lat1    = toRad( origin.lat() );
    const lng1    = toRad( origin.lng() );
    const bearing = toRad( bearingDeg );
    const d       = distanceKm / R; // angular distance in radians

    const lat2 = Math.asin(
      Math.sin( lat1 ) * Math.cos( d ) +
      Math.cos( lat1 ) * Math.sin( d ) * Math.cos( bearing )
    );

    const lng2 = lng1 + Math.atan2(
      Math.sin( bearing ) * Math.sin( d ) * Math.cos( lat1 ),
      Math.cos( d ) - Math.sin( lat1 ) * Math.sin( lat2 )
    );

    return new google.maps.LatLng( toDeg( lat2 ), toDeg( lng2 ) );
  }

  function toRad( deg ) { return deg * ( Math.PI / 180 ); }
  function toDeg( rad ) { return rad * ( 180 / Math.PI ); }

  // -----------------------------------------------------------------------
  // Route Display
  // -----------------------------------------------------------------------

  /**
   * Render the route on the map and zoom to fit.
   * @param {google.maps.DirectionsResult} result
   */
  function displayRoute( result ) {
    state.directionsRenderer.setDirections( result );

    // Fit map bounds to the route
    const bounds = new google.maps.LatLngBounds();
    result.routes[0].overview_path.forEach( function ( latlng ) {
      bounds.extend( latlng );
    } );
    state.map.fitBounds( bounds, { top: 40, right: 40, bottom: 40, left: 40 } );
  }

  /**
   * Populate the route summary panel.
   * @param {google.maps.DirectionsResult} result
   * @param {google.maps.LatLng[]}         waypointLatLngs
   */
  function displaySummary( result, waypointLatLngs ) {
    const route = result.routes[0];

    // Aggregate distance and duration across all legs
    let totalDistanceM  = 0;
    let totalDurationS  = 0;
    route.legs.forEach( function ( leg ) {
      totalDistanceM += leg.distance.value; // metres
      totalDurationS += leg.duration.value; // seconds
    } );

    // Format distance
    const totalMiles = ( totalDistanceM / 1609.34 ).toFixed( 1 );
    const totalKm    = ( totalDistanceM / 1000 ).toFixed( 1 );
    dom.summaryDistance.textContent = totalMiles + ' mi (' + totalKm + ' km)';

    // Format duration
    const hours   = Math.floor( totalDurationS / 3600 );
    const minutes = Math.round( ( totalDurationS % 3600 ) / 60 );
    let durationStr = '';
    if ( hours > 0 )   durationStr += hours + 'h ';
    if ( minutes > 0 ) durationStr += minutes + 'm';
    if ( ! durationStr ) durationStr = '<1m';
    dom.summaryDuration.textContent = durationStr.trim();

    // Waypoint count (not counting start/end)
    dom.summaryWaypoints.textContent = waypointLatLngs.length + ' stops';

    // Waypoint list — use leg start addresses from API response
    dom.waypointList.innerHTML = '';
    route.legs.forEach( function ( leg, i ) {
      if ( i < route.legs.length - 1 ) { // skip the last leg's end (= start)
        const li = document.createElement( 'li' );
        li.textContent = leg.end_address;
        dom.waypointList.appendChild( li );
      }
    } );

    // Filter tags
    if ( dom.filterTags ) {
      dom.filterTags.innerHTML = '';

      const planMode = getSelectedRadio( dom.planModeRadios );
      const roadPref = getSelectedRadio( dom.roadPrefRadios );
      const scenery  = getSelectedRadio( dom.sceneryRadios );
      const dir      = getSelectedRadio( dom.directionRadios );

      const durationLabels = {
        '1h': '1 hour', '2h': '2 hours', '3h': '3 hours',
        'half-day': 'Half day', 'full-day': 'Full day',
      };
      const roadLabels = {
        'extra-curvy': 'Extra Curvy', 'twisties': 'Twisties',
        'mixed': 'Mixed', 'highway': 'Highway',
      };
      const sceneryLabels = {
        'forest': 'Forest', 'water': 'Lakes & Rivers',
        'heide': 'Heathland', 'offroad': 'Offroad',
      };
      const dirLabels = {
        'north': 'North', 'east': 'East', 'south': 'South', 'west': 'West',
      };

      const tags = [];

      if ( planMode === 'time' ) {
        tags.push( durationLabels[ dom.durationSelect.value ] || dom.durationSelect.value );
      } else {
        tags.push( ( dom.distanceInput ? dom.distanceInput.value : '?' ) + ' km' );
      }

      tags.push( roadLabels[ roadPref ] || roadPref );

      if ( scenery !== 'any' && sceneryLabels[ scenery ] ) tags.push( sceneryLabels[ scenery ] );
      if ( dir !== 'any' && dirLabels[ dir ] )             tags.push( dirLabels[ dir ] );

      if ( dom.avoidHighways && dom.avoidHighways.checked ) tags.push( 'No highways' );
      if ( dom.avoidTolls    && dom.avoidTolls.checked    ) tags.push( 'No tolls' );
      if ( dom.avoidFerries  && dom.avoidFerries.checked  ) tags.push( 'No ferries' );
      if ( dom.avoidUnpaved  && dom.avoidUnpaved.checked  ) tags.push( 'No unpaved' );

      if ( state.endAddress ) tags.push( 'To: ' + state.endAddress.split( ',' )[ 0 ] );

      tags.forEach( function ( label ) {
        const span = document.createElement( 'span' );
        span.className   = 'filter-tag';
        span.textContent = label;
        dom.filterTags.appendChild( span );
      } );
    }

    // Show summary panel
    dom.routeSummary.hidden = false;
    // Scroll to summary in mobile view
    if ( window.innerWidth <= 900 ) {
      dom.routeSummary.scrollIntoView( { behavior: 'smooth', block: 'start' } );
    }
  }

  // -----------------------------------------------------------------------
  // Google Maps URL Export
  //
  // Format:
  //   https://www.google.com/maps/dir/?api=1
  //     &origin=ENCODED_START
  //     &destination=ENCODED_START   (loop: end = start)
  //     &waypoints=WP1|WP2|WP3      (lat,lng pairs)
  //     &travelmode=driving
  // -----------------------------------------------------------------------

  /**
   * Build the Google Maps URL from the current route and update the button href.
   * @param {google.maps.DirectionsResult} result
   */
  function buildGoogleMapsUrl( result ) {
    const route = result.routes[0];

    // Use the first leg's start_address as the origin text
    const originAddress = state.startAddress || route.legs[0].start_address;

    // Waypoints: collect intermediate lat,lng pairs
    // We use the actual LatLngs computed before (more reliable than parsing addresses)
    const waypointStrings = state.waypointLatLngs.map( function ( latlng ) {
      return latlng.lat().toFixed( 6 ) + ',' + latlng.lng().toFixed( 6 );
    } );

    const params = new URLSearchParams( {
      api:         '1',
      origin:      originAddress,
      destination: originAddress, // loop: same as origin
      waypoints:   waypointStrings.join( '|' ),
      travelmode:  'driving',
    } );

    const url = 'https://www.google.com/maps/dir/?' + params.toString();
    dom.btnOpenGmaps.href = url;
  }

  // -----------------------------------------------------------------------
  // Form Helpers
  // -----------------------------------------------------------------------

  /** Convert the duration select value to decimal hours */
  function durationToHours( value ) {
    const map = {
      '1h':       1,
      '2h':       2,
      '3h':       3,
      'half-day': 4.5,
      'full-day': 7.5,
    };
    return map[ value ] || 2;
  }

  /** Get the value of the selected radio button in a NodeList */
  function getSelectedRadio( radios ) {
    for ( let i = 0; i < radios.length; i++ ) {
      if ( radios[ i ].checked ) return radios[ i ].value;
    }
    return 'twisties';
  }

  /**
   * Build the "avoid" string for the Directions API.
   * Note: Google Directions API accepts avoid as separate boolean flags,
   * not a string — handled directly in the request object above.
   * This helper returns a human-readable summary for potential logging.
   */
  function buildAvoidString() {
    const avoid = [];
    if ( dom.avoidTolls   && dom.avoidTolls.checked   ) avoid.push( 'tolls' );
    if ( dom.avoidFerries && dom.avoidFerries.checked  ) avoid.push( 'ferries' );
    if ( dom.avoidUnpaved && dom.avoidUnpaved.checked  ) avoid.push( 'unpaved' );
    return avoid.join( ',' );
  }

  // -----------------------------------------------------------------------
  // Loading State
  // -----------------------------------------------------------------------

  function setLoading( isLoading ) {
    if ( ! dom.btnGenerate ) return;
    dom.btnGenerate.disabled = isLoading;

    const btnText    = dom.btnGenerate.querySelector( '.btn__text' );
    const btnSpinner = dom.btnGenerate.querySelector( '.btn__spinner' );

    if ( btnText )    btnText.textContent    = isLoading ? 'Generating...' : 'Generate Route';
    if ( btnSpinner ) btnSpinner.hidden      = ! isLoading;
  }

  // -----------------------------------------------------------------------
  // Error Helpers
  // -----------------------------------------------------------------------

  function showError( el, message ) {
    if ( ! el ) return;
    el.textContent = message;
    el.hidden = false;
  }

  function clearError( el ) {
    if ( ! el ) return;
    el.textContent = '';
    el.hidden = true;
  }

  function clearAllErrors() {
    clearError( dom.startError );
    clearError( dom.formError );
  }

  // -----------------------------------------------------------------------
  // Reset / Start Over
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // Plan Mode Toggle
  // -----------------------------------------------------------------------

  function handleModeToggle() {
    const mode = getSelectedRadio( dom.planModeRadios );
    if ( dom.durationGroup ) dom.durationGroup.hidden = ( mode === 'distance' );
    if ( dom.distanceGroup ) dom.distanceGroup.hidden = ( mode === 'time' );
  }

  // -----------------------------------------------------------------------
  // Random Route
  // -----------------------------------------------------------------------

  function handleRandom() {
    clearAllErrors();

    if ( ! state.startLatLng ) {
      showError( dom.startError, 'Enter a starting location first, then hit Random.' );
      if ( state.autocompleteEl ) state.autocompleteEl.focus();
      else dom.startInput.focus();
      return;
    }

    // Randomly pick planning mode (weighted 2:1 towards time)
    const randomMode = Math.random() < 0.67 ? 'time' : 'distance';
    dom.planModeRadios.forEach( function ( r ) { r.checked = r.value === randomMode; } );
    handleModeToggle();

    if ( randomMode === 'distance' ) {
      // Pick a random distance: 50–400 km in steps of 50
      const distOptions = [ 50, 100, 100, 150, 150, 200, 250, 300, 400 ];
      if ( dom.distanceInput ) {
        dom.distanceInput.value = distOptions[ Math.floor( Math.random() * distOptions.length ) ];
      }
    } else {
      // Randomly pick a duration (weighted away from extremes)
      const durations = [ '1h', '2h', '2h', '3h', '3h', 'half-day', 'full-day' ];
      dom.durationSelect.value = durations[ Math.floor( Math.random() * durations.length ) ];
    }

    // Randomly pick a road preference (no highway bias for random)
    const roadPrefs = [ 'extra-curvy', 'twisties', 'twisties', 'mixed' ];
    const randomPref = roadPrefs[ Math.floor( Math.random() * roadPrefs.length ) ];
    dom.roadPrefRadios.forEach( function ( r ) { r.checked = r.value === randomPref; } );

    // Randomly pick a scenery type (weighted towards "any")
    const sceneries = [ 'any', 'any', 'forest', 'water', 'heide' ];
    const randomScenery = sceneries[ Math.floor( Math.random() * sceneries.length ) ];
    dom.sceneryRadios.forEach( function ( r ) { r.checked = r.value === randomScenery; } );

    // Randomly pick a direction (weighted heavily towards "any" for proper loops)
    const directions = [ 'any', 'any', 'any', 'north', 'east', 'south', 'west' ];
    const randomDir = directions[ Math.floor( Math.random() * directions.length ) ];
    dom.directionRadios.forEach( function ( r ) { r.checked = r.value === randomDir; } );

    generateRoute();
  }

  function handleReset() {
    // Clear form
    if ( dom.form ) dom.form.reset();
    dom.startInput.value = '';
    if ( state.autocompleteEl ) state.autocompleteEl.value = '';
    state.startLatLng    = null;
    state.startAddress   = '';
    state.currentRoute   = null;
    state.waypointLatLngs = [];

    // Clear map route
    if ( state.directionsRenderer ) {
      state.directionsRenderer.setDirections( { routes: [] } );
    }

    // Hide summary
    clearRouteSummary();
    clearAllErrors();

    // Re-center map on default or geolocated position
    if ( state.map ) {
      const defaultCenter = {
        lat: parseFloat( rideloopData.defaultLat || 52.0907 ),
        lng: parseFloat( rideloopData.defaultLng || 5.1214 ),
      };
      state.map.setCenter( defaultCenter );
      state.map.setZoom( 7 );
    }

    // Return focus to the start input
    if ( dom.startInput ) dom.startInput.focus();
  }

  function clearRouteSummary() {
    if ( dom.routeSummary ) dom.routeSummary.hidden = true;
    if ( dom.summaryDistance )  dom.summaryDistance.textContent  = '—';
    if ( dom.summaryDuration )  dom.summaryDuration.textContent  = '—';
    if ( dom.summaryWaypoints ) dom.summaryWaypoints.textContent = '—';
    if ( dom.waypointList )     dom.waypointList.innerHTML       = '';
    if ( dom.filterTags )       dom.filterTags.innerHTML         = '';
    if ( dom.btnOpenGmaps )     dom.btnOpenGmaps.href            = '#';
  }

  // -----------------------------------------------------------------------
  // Graceful degradation: if no API key, the Maps API is not loaded at all.
  // The page still renders with the placeholder and a warning notice.
  // -----------------------------------------------------------------------

} )();
