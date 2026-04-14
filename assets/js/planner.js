/**
 * planner.js — RideLoop Route Planner
 *
 * Map:       Leaflet.js + OpenStreetMap tiles  (free)
 * Routing:   OSRM public API                   (free, no key)
 * Geocode:   Photon (Komoot) + Nominatim        (free)
 * Elevation: OpenTopoData                       (free)
 * POI:       Overpass API                       (free)
 * Export:    Google Maps URL — plain link, zero API cost
 *
 * PHP passes `rideloopData` via wp_localize_script:
 *  - rideloopData.defaultLat
 *  - rideloopData.defaultLng
 */

/* global L, rideloopData */

(function () {
	"use strict";

	// -----------------------------------------------------------------------
	// State
	// -----------------------------------------------------------------------
	const state = {
		map: null,
		routeLayer: null,      // Leaflet polyline
		markerGroup: null,     // Leaflet layer group for POI markers
		startLatLng: null,     // { lat, lng }
		startAddress: "",
		endLatLng: null,       // { lat, lng }
		endAddress: "",
		currentRoute: null,    // OSRM route object
		waypointLatLngs: [],   // [{ lat, lng }]
		poiMarkers: [],        // Leaflet marker instances
	};

	// -----------------------------------------------------------------------
	// DOM refs
	// -----------------------------------------------------------------------
	let dom = {};

	function cacheDom() {
		dom = {
			form:             document.getElementById("rideloop-planner-form"),
			startInput:       document.getElementById("planner-start"),
			planModeRadios:   document.querySelectorAll('input[name="plan_mode"]'),
			durationGroup:    document.getElementById("duration-group"),
			distanceGroup:    document.getElementById("distance-group"),
			durationSelect:   document.getElementById("planner-duration"),
			distanceInput:    document.getElementById("planner-distance"),
			roadPrefRadios:   document.querySelectorAll('input[name="road_pref"]'),
			sceneryRadios:    document.querySelectorAll('input[name="scenery"]'),
			directionRadios:  document.querySelectorAll('input[name="direction"]'),
			avoidHighways:    document.getElementById("avoid-highways"),
			avoidTolls:       document.getElementById("avoid-tolls"),
			avoidFerries:     document.getElementById("avoid-ferries"),
			avoidUnpaved:     document.getElementById("avoid-unpaved"),
			btnGenerate:      document.getElementById("btn-generate"),
			btnRandom:        document.getElementById("btn-random"),
			btnGeolocate:     document.getElementById("btn-geolocate"),
			endInput:         document.getElementById("planner-end"),
			endError:         document.getElementById("planner-end-error"),
			btnOpenGmaps:     document.getElementById("btn-open-gmaps"),
			btnShare:         document.getElementById("btn-share"),
			btnReset:         document.getElementById("btn-reset"),
			formError:        document.getElementById("planner-form-error"),
			startError:       document.getElementById("planner-start-error"),
			routeSummary:     document.getElementById("route-summary"),
			summaryDistance:  document.getElementById("summary-distance"),
			summaryDuration:  document.getElementById("summary-duration"),
			summaryWaypoints: document.getElementById("summary-waypoints"),
			filterTags:       document.getElementById("route-filter-tags"),
			waypointList:     document.getElementById("waypoint-list"),
			poiSection:       document.getElementById("poi-section"),
			poiList:          document.getElementById("poi-list"),
			weatherSection:   document.getElementById("weather-section"),
			weatherContent:   document.getElementById("weather-content"),
			elevationSection: document.getElementById("elevation-section"),
			elevationChart:   document.getElementById("elevation-chart"),
			elevationMin:     document.getElementById("elevation-min"),
			elevationMax:     document.getElementById("elevation-max"),
			gmapsTip:         document.getElementById("gmaps-tip"),
			mapDiv:           document.getElementById("rideloop-map"),
			mapPlaceholder:   document.getElementById("map-placeholder"),
		};
	}

	// -----------------------------------------------------------------------
	// Init — runs on DOMContentLoaded (no external API callback needed)
	// -----------------------------------------------------------------------

	document.addEventListener("DOMContentLoaded", function () {
		cacheDom();
		if (!dom.mapDiv) return;

		const defaultCenter = {
			lat: parseFloat((rideloopData && rideloopData.defaultLat) || 52.0907),
			lng: parseFloat((rideloopData && rideloopData.defaultLng) || 5.1214),
		};

		// ---- Leaflet map ----
		state.map = L.map(dom.mapDiv, {
			center: [defaultCenter.lat, defaultCenter.lng],
			zoom: 7,
			zoomControl: true,
		});

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19,
		}).addTo(state.map);

		state.markerGroup = L.layerGroup().addTo(state.map);

		if (dom.mapPlaceholder) {
			dom.mapPlaceholder.classList.add("hidden");
		}

		// ---- Photon autocomplete ----
		initPhotonAutocomplete(
			dom.startInput,
			function (latlng, address) {
				state.startLatLng = latlng;
				state.startAddress = address;
				clearError(dom.startError);
			},
			function () {
				state.startLatLng = null;
				state.startAddress = "";
			}
		);

		if (dom.endInput) {
			initPhotonAutocomplete(
				dom.endInput,
				function (latlng, address) {
					state.endLatLng = latlng;
					state.endAddress = address;
					clearError(dom.endError);
				},
				function () {
					state.endLatLng = null;
					state.endAddress = "";
				}
			);
		}

		// ---- Event listeners ----
		if (dom.btnGeolocate) dom.btnGeolocate.addEventListener("click", handleGeolocate);
		if (dom.form)         dom.form.addEventListener("submit", handleFormSubmit);
		if (dom.btnRandom)    dom.btnRandom.addEventListener("click", handleRandom);
		if (dom.btnShare)     dom.btnShare.addEventListener("click", handleShare);
		if (dom.btnReset)     dom.btnReset.addEventListener("click", handleReset);

		dom.planModeRadios.forEach(function (r) {
			r.addEventListener("change", handleModeToggle);
		});

		initStepNav();

		// Pre-fill from ?start_location= URL param (passed from hero form)
		const urlParams = new URLSearchParams(window.location.search);
		const startParam = urlParams.get("start_location");
		if (startParam && dom.startInput) {
			dom.startInput.value = decodeURIComponent(startParam);
		}
	});

	// -----------------------------------------------------------------------
	// Photon Autocomplete
	// -----------------------------------------------------------------------

	/**
	 * Attach a Photon-powered suggestion dropdown to a text input.
	 *
	 * @param {HTMLInputElement} input     - The input to enhance
	 * @param {Function}         onSelect  - Called with ({ lat, lng }, address) on pick
	 * @param {Function}         onType    - Called whenever the user types (invalidates latlng)
	 */
	function initPhotonAutocomplete(input, onSelect, onType) {
		if (!input) return;

		const wrapper = input.closest(".input-with-btn") || input.parentElement;
		wrapper.style.position = "relative";

		const dropdown = document.createElement("ul");
		dropdown.className = "autocomplete-dropdown";
		dropdown.setAttribute("role", "listbox");
		dropdown.hidden = true;
		wrapper.appendChild(dropdown);

		let debounceTimer = null;
		let activeIndex   = -1;

		function closeDropdown() {
			dropdown.hidden = true;
			dropdown.innerHTML = "";
			activeIndex = -1;
		}

		function setActive(index) {
			const items = dropdown.querySelectorAll("li");
			items.forEach(function (li, i) {
				li.classList.toggle("is-active", i === index);
			});
			activeIndex = index;
		}

		function pickItem(label, latlng) {
			input.value = label;
			closeDropdown();
			if (onSelect) onSelect(latlng, label);
		}

		input.addEventListener("input", function () {
			if (onType) onType();
			clearTimeout(debounceTimer);
			const q = input.value.trim();
			if (q.length < 3) { closeDropdown(); return; }

			debounceTimer = setTimeout(function () {
				fetch(
					"https://photon.komoot.io/api/?q=" + encodeURIComponent(q) + "&limit=5",
					{ headers: { Accept: "application/json" } }
				)
					.then(function (r) { return r.json(); })
					.then(function (data) {
						dropdown.innerHTML = "";
						activeIndex = -1;
						if (!data.features || data.features.length === 0) {
							closeDropdown();
							return;
						}
						data.features.forEach(function (feature) {
							const coords = feature.geometry.coordinates; // [lng, lat]
							const label  = buildPhotonLabel(feature.properties);
							const li     = document.createElement("li");
							li.setAttribute("role", "option");
							li.textContent = label;
							li.addEventListener("mousedown", function (e) {
								e.preventDefault(); // prevent blur before click
								pickItem(label, { lat: coords[1], lng: coords[0] });
							});
							dropdown.appendChild(li);
						});
						dropdown.hidden = false;
					})
					.catch(function () { closeDropdown(); });
			}, 300);
		});

		input.addEventListener("keydown", function (e) {
			const items = dropdown.querySelectorAll("li");
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setActive(Math.min(activeIndex + 1, items.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActive(Math.max(activeIndex - 1, 0));
			} else if (e.key === "Enter" && activeIndex >= 0) {
				e.preventDefault();
				items[activeIndex].dispatchEvent(new MouseEvent("mousedown"));
			} else if (e.key === "Escape") {
				closeDropdown();
			}
		});

		input.addEventListener("blur", function () {
			setTimeout(closeDropdown, 150);
		});
	}

	function buildPhotonLabel(props) {
		const parts = [];
		if (props.name) parts.push(props.name);
		if (props.street && props.housenumber) parts.push(props.street + " " + props.housenumber);
		else if (props.street) parts.push(props.street);
		if (props.city && props.city !== props.name) parts.push(props.city);
		if (props.country) parts.push(props.country);
		return parts.join(", ");
	}

	// -----------------------------------------------------------------------
	// Geocoding — Nominatim fallback
	// (used when user typed but did not pick from autocomplete)
	// -----------------------------------------------------------------------

	function geocodeAddress(address, callback) {
		fetch(
			"https://nominatim.openstreetmap.org/search?q=" +
				encodeURIComponent(address) +
				"&format=json&limit=1",
			{
				headers: {
					"User-Agent": "RideLoop/1.0",
					Accept: "application/json",
				},
			}
		)
			.then(function (r) { return r.json(); })
			.then(function (data) {
				if (data && data.length > 0) {
					callback(
						{ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
						data[0].display_name
					);
				} else {
					callback(null, null);
				}
			})
			.catch(function () { callback(null, null); });
	}

	// -----------------------------------------------------------------------
	// Geolocation
	// -----------------------------------------------------------------------

	function handleGeolocate() {
		if (!navigator.geolocation) {
			showError(dom.startError, "Geolocation is not supported by your browser.");
			return;
		}

		dom.btnGeolocate.disabled = true;
		dom.btnGeolocate.setAttribute("aria-label", "Detecting location...");

		navigator.geolocation.getCurrentPosition(
			function (position) {
				const lat = position.coords.latitude;
				const lng = position.coords.longitude;

				fetch(
					"https://nominatim.openstreetmap.org/reverse?lat=" +
						lat + "&lon=" + lng + "&format=json",
					{
						headers: {
							"User-Agent": "RideLoop/1.0",
							Accept: "application/json",
						},
					}
				)
					.then(function (r) { return r.json(); })
					.then(function (data) {
						dom.btnGeolocate.disabled = false;
						dom.btnGeolocate.setAttribute("aria-label", "Use my current location");
						const address = data.display_name || lat.toFixed(5) + ", " + lng.toFixed(5);
						dom.startInput.value = address;
						state.startLatLng   = { lat: lat, lng: lng };
						state.startAddress  = address;
						state.map.setView([lat, lng], 10);
					})
					.catch(function () {
						dom.btnGeolocate.disabled = false;
						dom.btnGeolocate.setAttribute("aria-label", "Use my current location");
						dom.startInput.value = lat.toFixed(5) + ", " + lng.toFixed(5);
						state.startLatLng  = { lat: lat, lng: lng };
						state.startAddress = dom.startInput.value;
						state.map.setView([lat, lng], 10);
					});
			},
			function (err) {
				dom.btnGeolocate.disabled = false;
				dom.btnGeolocate.setAttribute("aria-label", "Use my current location");
				const msgs = {
					1: "Location access was denied. Please allow it in your browser settings.",
					2: "Location unavailable. Try entering your address manually.",
					3: "Location request timed out. Try again.",
				};
				showError(dom.startError, msgs[err.code] || "Could not get your location.");
			},
			{ timeout: 10000, maximumAge: 30000 }
		);
	}

	// -----------------------------------------------------------------------
	// Form Submit Handler
	// -----------------------------------------------------------------------

	function handleFormSubmit(e) {
		e.preventDefault();
		clearAllErrors();

		const rawInput = dom.startInput.value.trim();
		if (!rawInput) {
			showError(dom.startError, "Please enter a starting location.");
			dom.startInput.focus();
			return;
		}

		if (!state.startLatLng) {
			setLoading(true);
			geocodeAddress(rawInput, function (latlng, address) {
				if (!latlng) {
					setLoading(false);
					showError(
						dom.startError,
						"Could not find that location. Please try a more specific address."
					);
					return;
				}
				state.startLatLng  = latlng;
				state.startAddress = address || rawInput;
				geocodeEndThenGenerate();
			});
		} else {
			geocodeEndThenGenerate();
		}
	}

	function geocodeEndThenGenerate() {
		const rawEnd = (dom.endInput ? dom.endInput.value : "").trim();

		if (!rawEnd) {
			state.endLatLng  = null;
			state.endAddress = "";
			generateRoute();
			return;
		}

		if (!state.endLatLng) {
			setLoading(true);
			geocodeAddress(rawEnd, function (latlng, address) {
				if (!latlng) {
					setLoading(false);
					showError(
						dom.endError,
						"Could not find that end location. Please try a more specific address."
					);
					return;
				}
				state.endLatLng  = latlng;
				state.endAddress = address || rawEnd;
				generateRoute();
			});
		} else {
			generateRoute();
		}
	}

	// -----------------------------------------------------------------------
	// Route Generation — Core Logic
	// -----------------------------------------------------------------------

	async function generateRoute() {
		setLoading(true);
		clearRouteSummary();

		const roadPref = getSelectedRadio(dom.roadPrefRadios);
		const scenery  = getSelectedRadio(dom.sceneryRadios);
		const planMode = getSelectedRadio(dom.planModeRadios);

		let totalKm;
		if (planMode === "distance") {
			const rawKm = dom.distanceInput ? parseFloat(dom.distanceInput.value) : NaN;
			if (!rawKm || rawKm < 20 || rawKm > 1200) {
				setLoading(false);
				showError(dom.formError, "Enter a distance between 20 and 1200 km.");
				return;
			}
			totalKm = rawKm;
		} else {
			const durationHours = durationToHours(dom.durationSelect.value);
			const speedMap = { "extra-curvy": 50, twisties: 60, mixed: 75, highway: 100 };
			totalKm = (speedMap[roadPref] || 65) * durationHours;
		}

		const waypointCounts = { "extra-curvy": 5, twisties: 4, mixed: 3, highway: 2 };
		const loopCount = waypointCounts[roadPref] || 4;

		const reachFactors = { "extra-curvy": 0.1, twisties: 0.11, mixed: 0.13, highway: 0.16 };
		const reachKm = totalKm * (reachFactors[roadPref] || 0.12);

		const dirBearingMap = { north: 0, east: 90, south: 180, west: 270 };
		const direction  = getSelectedRadio(dom.directionRadios);
		const dirBearing = direction === "any" ? null : (dirBearingMap[direction] ?? null);

		let waypointLatLngs = buildLoopWaypoints(
			state.startLatLng, reachKm, dirBearing, loopCount
		);

		if (scenery === "offroad" && dom.avoidUnpaved) {
			dom.avoidUnpaved.checked = false;
		}

		if (scenery !== "any") {
			const tipIdx      = Math.floor(waypointLatLngs.length / 2);
			const searchCenter = waypointLatLngs[tipIdx] || state.startLatLng;
			const searchRadiusM = reachKm * 1500;
			const sceneryLatlng = await findSceneryWaypoint(scenery, searchCenter, searchRadiusM);
			if (sceneryLatlng) {
				waypointLatLngs.splice(tipIdx, 0, sceneryLatlng);
			}
		}

		state.waypointLatLngs = waypointLatLngs;

		const destination = state.endLatLng || state.startLatLng;

		const avoidParts = [];
		if (dom.avoidHighways && dom.avoidHighways.checked) avoidParts.push("motorway");
		if (dom.avoidFerries  && dom.avoidFerries.checked)  avoidParts.push("ferry");

		requestOsrmRoute(state.startLatLng, destination, waypointLatLngs, avoidParts, 0);
	}

	// -----------------------------------------------------------------------
	// OSRM Routing
	// -----------------------------------------------------------------------

	/**
	 * Request a route via the OSRM public API.
	 * Retries up to 2 times with progressively looser constraints.
	 */
	function requestOsrmRoute(origin, destination, waypointLatLngs, avoidParts, retryLevel) {
		// OSRM expects coordinates as lng,lat separated by semicolons
		const allPoints = [origin].concat(waypointLatLngs).concat([destination]);
		const coordStr  = allPoints
			.map(function (p) { return p.lng.toFixed(6) + "," + p.lat.toFixed(6); })
			.join(";");

		let url =
			"https://router.project-osrm.org/route/v1/driving/" +
			coordStr +
			"?overview=full&geometries=geojson&steps=false";

		if (avoidParts.length > 0) {
			url += "&exclude=" + avoidParts.join(",");
		}

		fetch(url)
			.then(function (r) { return r.json(); })
			.then(function (data) {
				if (data.code === "Ok" && data.routes && data.routes.length > 0) {
					setLoading(false);
					state.currentRoute = data.routes[0];
					displayRoute(state.currentRoute);
					displaySummary(state.currentRoute, waypointLatLngs);
					buildGoogleMapsUrl();
					findAndDisplayPois(state.currentRoute); // async — runs in background
					fetchElevationProfile(state.currentRoute);
					fetchWeather(state.startLatLng);
					return;
				}

				if (retryLevel < 2) {
					var nextAvoid     = avoidParts.slice();
					var nextWaypoints = waypointLatLngs;

					if (retryLevel === 0) {
						// Drop motorway avoidance — waypoints may require crossing one
						nextAvoid = avoidParts.filter(function (a) { return a !== "motorway"; });
					} else if (retryLevel === 1) {
						// Reduce to 2 waypoints and drop all avoid constraints
						nextAvoid     = [];
						nextWaypoints = [
							waypointLatLngs[0],
							waypointLatLngs[Math.floor(waypointLatLngs.length / 2)],
						].filter(Boolean);
						state.waypointLatLngs = nextWaypoints;
					}
					requestOsrmRoute(origin, destination, nextWaypoints, nextAvoid, retryLevel + 1);
					return;
				}

				setLoading(false);
				showError(
					dom.formError,
					"No route found. Your location may have limited road access — try a nearby town or a longer trip duration."
				);
			})
			.catch(function () {
				if (retryLevel < 2) {
					requestOsrmRoute(origin, destination, waypointLatLngs, [], retryLevel + 1);
					return;
				}
				setLoading(false);
				showError(
					dom.formError,
					"Route generation failed. Please check your connection and try again."
				);
			});
	}

	// -----------------------------------------------------------------------
	// Waypoint Geometry Helpers
	// -----------------------------------------------------------------------

	/**
	 * Build waypoints for a geometrically correct closed loop.
	 * Uses plain { lat, lng } objects (no Google Maps dependency).
	 *
	 * @param {{ lat: number, lng: number }} start    - Start/end of the ride
	 * @param {number}  radiusKm   - Loop circle radius in km
	 * @param {number|null} dirBearing - Bearing for loop center (0=N…) or null=random
	 * @param {number}  count      - Number of intermediate waypoints
	 * @returns {{ lat: number, lng: number }[]}
	 */
	function buildLoopWaypoints(start, radiusKm, dirBearing, count) {
		const loopBearing =
			dirBearing !== null ? dirBearing : Math.floor(Math.random() * 360);
		const loopCenter = offsetLatLng(start, radiusKm, loopBearing);

		const totalPoints = count + 1;
		const angleStep   = 360 / totalPoints;
		const startPos    = (loopBearing + 180) % 360;
		const firstAngle  = (startPos + angleStep) % 360;

		const points = [];
		for (let i = 0; i < count; i++) {
			const angle = (firstAngle + i * angleStep) % 360;
			points.push(offsetLatLng(loopCenter, radiusKm, angle));
		}
		return points;
	}

	/**
	 * Offset a { lat, lng } by distanceKm in bearingDeg.
	 * Spherical Earth approximation — accurate to <0.5% for <1000 km.
	 */
	function offsetLatLng(origin, distanceKm, bearingDeg) {
		const R       = 6371;
		const lat1    = toRad(origin.lat);
		const lng1    = toRad(origin.lng);
		const bearing = toRad(bearingDeg);
		const d       = distanceKm / R;

		const lat2 = Math.asin(
			Math.sin(lat1) * Math.cos(d) +
				Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
		);
		const lng2 =
			lng1 +
			Math.atan2(
				Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
				Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
			);

		return { lat: toDeg(lat2), lng: toDeg(lng2) };
	}

	function toRad(deg) { return deg * (Math.PI / 180); }
	function toDeg(rad) { return rad * (180 / Math.PI); }

	// -----------------------------------------------------------------------
	// Scenery Waypoint — Overpass API
	// -----------------------------------------------------------------------

	/**
	 * Find a natural-area node matching the requested scenery type.
	 * Returns { lat, lng } to insert as an extra waypoint, or null.
	 */
	async function findSceneryWaypoint(scenery, searchCenter, radiusM) {
		const filterMap = {
			forest:  '["landuse"="forest"]',
			water:   '["natural"~"water|bay"]',
			heide:   '["natural"="heath"]',
			offroad: '["highway"~"track|path"]["tracktype"~"grade1|grade2"]',
		};
		const filter = filterMap[scenery];
		if (!filter) return null;

		const lat = searchCenter.lat.toFixed(6);
		const lng = searchCenter.lng.toFixed(6);
		const r   = Math.min(Math.round(radiusM), 50000);

		const query =
			"[out:json][timeout:8];" +
			"(node" + filter + "(around:" + r + "," + lat + "," + lng + ");" +
			"way"  + filter + "(around:" + r + "," + lat + "," + lng + "););" +
			"out center 3;";

		try {
			const res  = await fetch("https://overpass-api.de/api/interpreter", {
				method: "POST",
				body:   "data=" + encodeURIComponent(query),
			});
			const data = await res.json();
			if (!data.elements || data.elements.length === 0) return null;

			const el    = data.elements[0];
			const elLat = el.lat || (el.center && el.center.lat);
			const elLng = el.lon || (el.center && el.center.lon);
			if (elLat && elLng) return { lat: elLat, lng: elLng };
		} catch (e) {
			// non-critical
		}
		return null;
	}

	// -----------------------------------------------------------------------
	// Route Display
	// -----------------------------------------------------------------------

	function displayRoute(result) {
		if (state.routeLayer) {
			state.map.removeLayer(state.routeLayer);
			state.routeLayer = null;
		}

		// OSRM GeoJSON geometry: coordinates are [lng, lat]; Leaflet needs [lat, lng]
		const coords = result.geometry.coordinates.map(function (c) {
			return [c[1], c[0]];
		});

		state.routeLayer = L.polyline(coords, {
			color:   "#FF6B00",
			weight:  5,
			opacity: 0.85,
		}).addTo(state.map);

		state.map.fitBounds(state.routeLayer.getBounds(), {
			paddingTopLeft:     [40, 40],
			paddingBottomRight: [40, 40],
		});
	}

	// -----------------------------------------------------------------------
	// Summary Display
	// -----------------------------------------------------------------------

	function displaySummary(result, waypointLatLngs) {
		const totalDistanceM = result.distance;
		const totalDurationS = result.duration;

		const totalMiles = (totalDistanceM / 1609.34).toFixed(1);
		const totalKm    = (totalDistanceM / 1000).toFixed(1);
		dom.summaryDistance.textContent = totalMiles + " mi (" + totalKm + " km)";

		const hours   = Math.floor(totalDurationS / 3600);
		const minutes = Math.round((totalDurationS % 3600) / 60);
		let durationStr = "";
		if (hours > 0)   durationStr += hours + "h ";
		if (minutes > 0) durationStr += minutes + "m";
		if (!durationStr) durationStr = "<1m";
		dom.summaryDuration.textContent = durationStr.trim();

		dom.summaryWaypoints.textContent = waypointLatLngs.length + " stops";

		dom.waypointList.innerHTML = "";
		waypointLatLngs.forEach(function (latlng, i) {
			const li = document.createElement("li");
			li.textContent =
				"Stop " + (i + 1) + " — " +
				latlng.lat.toFixed(4) + ", " + latlng.lng.toFixed(4);
			dom.waypointList.appendChild(li);
		});

		if (dom.filterTags) {
			dom.filterTags.innerHTML = "";

			const planMode = getSelectedRadio(dom.planModeRadios);
			const roadPref = getSelectedRadio(dom.roadPrefRadios);
			const scenery  = getSelectedRadio(dom.sceneryRadios);
			const dir      = getSelectedRadio(dom.directionRadios);

			const durationLabels = {
				"1h": "1 hour", "2h": "2 hours", "3h": "3 hours",
				"half-day": "Half day", "full-day": "Full day",
			};
			const roadLabels = {
				"extra-curvy": "Extra Curvy", twisties: "Twisties",
				mixed: "Mixed", highway: "Highway",
			};
			const sceneryLabels = {
				forest: "Forest", water: "Lakes & Rivers",
				heide: "Heathland", offroad: "Offroad",
			};
			const dirLabels = { north: "North", east: "East", south: "South", west: "West" };

			const tags = [];
			if (planMode === "time") {
				tags.push(durationLabels[dom.durationSelect.value] || dom.durationSelect.value);
			} else {
				tags.push((dom.distanceInput ? dom.distanceInput.value : "?") + " km");
			}
			tags.push(roadLabels[roadPref] || roadPref);
			if (scenery !== "any" && sceneryLabels[scenery]) tags.push(sceneryLabels[scenery]);
			if (dir !== "any" && dirLabels[dir]) tags.push(dirLabels[dir]);
			if (dom.avoidHighways && dom.avoidHighways.checked) tags.push("No highways");
			if (dom.avoidTolls    && dom.avoidTolls.checked)    tags.push("No tolls");
			if (dom.avoidFerries  && dom.avoidFerries.checked)  tags.push("No ferries");
			if (dom.avoidUnpaved  && dom.avoidUnpaved.checked)  tags.push("No unpaved");
			if (state.endAddress) tags.push("To: " + state.endAddress.split(",")[0]);

			tags.forEach(function (label) {
				const span = document.createElement("span");
				span.className  = "filter-tag";
				span.textContent = label;
				dom.filterTags.appendChild(span);
			});
		}

		dom.routeSummary.hidden = false;
		if (window.innerWidth <= 900) {
			dom.routeSummary.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}

	// -----------------------------------------------------------------------
	// Google Maps URL Export — plain link, zero API cost
	// -----------------------------------------------------------------------

	function buildGoogleMapsUrl() {
		const originAddress      = state.startAddress;
		const destinationAddress = state.endAddress || originAddress;

		const waypointStrings = state.waypointLatLngs.map(function (latlng) {
			return latlng.lat.toFixed(6) + "," + latlng.lng.toFixed(6);
		});

		const params = new URLSearchParams({
			api:         "1",
			origin:      originAddress,
			destination: destinationAddress,
			waypoints:   waypointStrings.join("|"),
			travelmode:  "driving",
		});

		dom.btnOpenGmaps.href = "https://www.google.com/maps/dir/?" + params.toString();

		if (dom.gmapsTip) {
			const avoiding = [];
			if (dom.avoidHighways && dom.avoidHighways.checked) avoiding.push("Highways");
			if (dom.avoidTolls    && dom.avoidTolls.checked)    avoiding.push("Tolls");
			if (dom.avoidFerries  && dom.avoidFerries.checked)  avoiding.push("Ferries");

			let avoidNote = "";
			if (avoiding.length) {
				const tags = avoiding
					.map(function (a) {
						return '<span class="gmaps-tip__tag">' + a + "</span>";
					})
					.join("");
				avoidNote = " Under <strong>Avoid</strong> enable: " + tags;
			}

			dom.gmapsTip.innerHTML =
				'<div class="gmaps-tip__icon" aria-hidden="true">ℹ️</div>' +
				'<div class="gmaps-tip__body">' +
				"<strong>Tip: set route options in Google Maps</strong>" +
				"<p>After opening, tap <strong>&#8942; → Route options</strong> to configure driving preferences." +
				avoidNote + "</p>" +
				"</div>";
			dom.gmapsTip.hidden = false;
		}
	}

	// -----------------------------------------------------------------------
	// Points of Interest — Overpass API
	// -----------------------------------------------------------------------

	async function findAndDisplayPois(result) {
		clearPoiMarkers();
		if (!dom.poiSection || !dom.poiList) return;
		dom.poiList.innerHTML = "";
		dom.poiSection.hidden = true;

		const coords = result.geometry.coordinates; // [lng, lat] pairs
		if (!coords || coords.length === 0) return;

		// Sample 7 points distributed along the route
		const step         = Math.max(1, Math.floor(coords.length / 7));
		const samplePoints = [];
		for (let i = step; i < coords.length - 1; i += step) {
			samplePoints.push({ lat: coords[i][1], lng: coords[i][0] });
		}

		const RADIUS_M = 12000;
		const MAX_TOTAL = 12;
		const seen = new Set();
		const pois = [];

		for (const center of samplePoints) {
			if (pois.length >= MAX_TOTAL) break;
			const results = await searchPoisNear(center, RADIUS_M);
			for (const poi of results) {
				if (pois.length >= MAX_TOTAL) break;
				const key = poi.name.toLowerCase().substring(0, 20);
				if (!seen.has(key)) {
					seen.add(key);
					pois.push(poi);
				}
			}
		}

		if (pois.length === 0) return;

		pois.forEach(function (poi) {
			try {
				const marker = L.circleMarker([poi.latlng.lat, poi.latlng.lng], {
					radius:      10,
					fillColor:   "#FF6B00",
					fillOpacity: 1,
					color:       "#fff",
					weight:      2.5,
				}).addTo(state.markerGroup);

				const popupHtml =
					'<div style="min-width:160px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif">' +
					'<p style="font-size:13px;font-weight:700;margin:0 0 6px">' + poi.name + "</p>" +
					(poi.website
						? '<a href="' + poi.website + '" target="_blank" rel="noopener" ' +
						  'style="font-size:11px;font-weight:600;color:#fff;background:#FF6B00;' +
						  'text-decoration:none;padding:4px 10px;border-radius:99px;display:inline-block">' +
						  "Visit website</a>"
						: "") +
					"</div>";

				marker.bindPopup(popupHtml);
				state.poiMarkers.push(marker);

				const li = document.createElement("li");
				li.className = "poi-item";

				const dot = document.createElement("span");
				dot.className = "poi-item__dot";
				dot.setAttribute("aria-hidden", "true");

				const info = document.createElement("span");
				info.className = "poi-item__info";

				const nameEl = document.createElement("span");
				nameEl.className  = "poi-item__name";
				nameEl.textContent = poi.name;
				info.appendChild(nameEl);

				li.appendChild(dot);
				li.appendChild(info);

				if (poi.website) {
					const link    = document.createElement("a");
					link.className = "poi-item__link";
					link.href      = poi.website;
					link.target    = "_blank";
					link.rel       = "noopener";
					link.textContent = "Visit website";
					link.addEventListener("click", function (e) { e.stopPropagation(); });
					li.appendChild(link);
				}

				li.addEventListener("click", function () {
					state.map.setView([poi.latlng.lat, poi.latlng.lng], 14);
					marker.openPopup();
				});

				dom.poiList.appendChild(li);
			} catch (err) {
				console.error("[POI] error:", err);
			}
		});

		// Collapse items beyond the 3rd
		const items = dom.poiList.querySelectorAll("li");
		if (items.length > 3) {
			const overflow = document.createElement("div");
			overflow.className = "poi-overflow";
			overflow.hidden    = true;
			for (let i = 3; i < items.length; i++) {
				overflow.appendChild(items[i]);
			}
			dom.poiList.after(overflow);

			const toggle        = document.createElement("button");
			toggle.type         = "button";
			toggle.className    = "poi-toggle";
			toggle.textContent  = "Show " + (items.length - 3) + " more";
			overflow.after(toggle);

			toggle.addEventListener("click", function () {
				const isOpen      = !overflow.hidden;
				overflow.hidden   = isOpen;
				toggle.textContent = isOpen
					? "Show " + (items.length - 3) + " more"
					: "Show less";
			});
		}

		dom.poiSection.hidden = false;
	}

	async function searchPoisNear(center, radiusM) {
		const lat = center.lat.toFixed(6);
		const lng = center.lng.toFixed(6);

		const query =
			"[out:json][timeout:8];(" +
			'node["tourism"~"attraction|museum|viewpoint|camp_site|artwork"]' +
			"(around:" + radiusM + "," + lat + "," + lng + ");" +
			'node["historic"~"castle|monument|ruins|memorial"]' +
			"(around:" + radiusM + "," + lat + "," + lng + ");" +
			");out 8;";

		try {
			const res  = await fetch("https://overpass-api.de/api/interpreter", {
				method: "POST",
				body:   "data=" + encodeURIComponent(query),
			});
			const data = await res.json();
			if (!data.elements || data.elements.length === 0) return [];

			return data.elements
				.filter(function (el) { return el.tags && el.tags.name; })
				.slice(0, 5)
				.map(function (el) {
					return {
						name:    el.tags.name,
						latlng:  { lat: el.lat, lng: el.lon },
						website: el.tags.website || el.tags["contact:website"] || null,
					};
				});
		} catch (e) {
			return [];
		}
	}

	function clearPoiMarkers() {
		if (state.markerGroup) state.markerGroup.clearLayers();
		state.poiMarkers = [];
	}

	// -----------------------------------------------------------------------
	// Elevation Profile — OpenTopoData
	// -----------------------------------------------------------------------

	async function fetchElevationProfile(result) {
		if (!dom.elevationSection) return;
		const coords = result.geometry.coordinates;
		if (!coords || coords.length === 0) return;

		// OpenTopoData: max 100 locations per request, 1 req/s fair use
		const MAX_SAMPLES = 80;
		const step    = Math.max(1, Math.floor(coords.length / MAX_SAMPLES));
		const sampled = coords.filter(function (_, i) { return i % step === 0; });

		const locStr = sampled
			.map(function (c) { return c[1].toFixed(5) + "," + c[0].toFixed(5); })
			.join("|");

		try {
			const res  = await fetch(
				"https://api.opentopodata.org/v1/srtm30m?locations=" + locStr
			);
			const data = await res.json();
			if (data.status !== "OK" || !data.results || data.results.length === 0) return;
			drawElevationChart(data.results);
			dom.elevationSection.hidden = false;
		} catch (e) {
			// non-critical
		}
	}

	function drawElevationChart(elevations) {
		if (!dom.elevationChart) return;
		const W  = dom.elevationChart.parentElement.clientWidth || 280;
		const H  = 72;
		const PT = 4, PR = 2, PB = 4, PL = 2;

		const vals  = elevations.map(function (e) { return e.elevation; });
		const minE  = Math.min.apply(null, vals);
		const maxE  = Math.max.apply(null, vals);
		const range = maxE - minE || 1;
		const n     = vals.length;

		function xp(i) { return PL + (i / (n - 1)) * (W - PL - PR); }
		function yp(v) { return H - PB - ((v - minE) / range) * (H - PT - PB); }

		const linePts  = vals.map(function (v, i) { return xp(i) + "," + yp(v); }).join(" ");
		const areaBase = H - PB;
		const areaPts  =
			xp(0) + "," + areaBase + " " +
			linePts + " " +
			xp(n - 1) + "," + areaBase;

		dom.elevationChart.setAttribute("viewBox", "0 0 " + W + " " + H);
		dom.elevationChart.setAttribute("width", W);
		dom.elevationChart.setAttribute("height", H);
		dom.elevationChart.innerHTML = [
			"<defs>",
			'  <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">',
			'    <stop offset="0%" stop-color="#FF6B00" stop-opacity="0.35"/>',
			'    <stop offset="100%" stop-color="#FF6B00" stop-opacity="0.03"/>',
			"  </linearGradient>",
			"</defs>",
			'<polygon points="' + areaPts + '" fill="url(#eg)"/>',
			'<polyline points="' + linePts + '" fill="none" stroke="#FF6B00" ' +
				'stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>',
		].join("");

		if (dom.elevationMin) dom.elevationMin.textContent = Math.round(minE) + " m";
		if (dom.elevationMax) dom.elevationMax.textContent = Math.round(maxE) + " m";
	}

	// -----------------------------------------------------------------------
	// Weather — Open-Meteo (already free and unchanged)
	// -----------------------------------------------------------------------

	async function fetchWeather(latlng) {
		if (!dom.weatherSection || !dom.weatherContent || !latlng) return;

		const url =
			"https://api.open-meteo.com/v1/forecast" +
			"?latitude="  + latlng.lat +
			"&longitude=" + latlng.lng +
			"&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m" +
			"&wind_speed_unit=kmh" +
			"&timezone=auto";

		try {
			const res  = await fetch(url);
			if (!res.ok) return;
			const data = await res.json();
			const c    = data.current;
			if (!c) return;

			const temp  = Math.round(c.temperature_2m);
			const feels = Math.round(c.apparent_temperature);
			const wind  = Math.round(c.windspeed_10m);

			dom.weatherContent.innerHTML =
				'<div class="weather-icon">' + wmoIcon(c.weathercode) + "</div>" +
				'<div class="weather-details">' +
				'<span class="weather-temp">' + temp + "°C</span>" +
				'<span class="weather-label">' + wmoLabel(c.weathercode) + "</span>" +
				'<span class="weather-meta">Feels ' + feels + "°C &middot; Wind " + wind + " km/h</span>" +
				"</div>";

			dom.weatherSection.hidden = false;
		} catch (e) { /* non-critical */ }
	}

	function wmoIcon(code) {
		if (code === 0)    return "☀️";
		if (code <= 2)     return "⛅";
		if (code === 3)    return "☁️";
		if (code <= 49)    return "🌫️";
		if (code <= 57)    return "🌦️";
		if (code <= 67)    return "🌧️";
		if (code <= 77)    return "❄️";
		if (code <= 82)    return "🌦️";
		if (code <= 86)    return "🌨️";
		if (code <= 99)    return "⛈️";
		return "🌡️";
	}

	function wmoLabel(code) {
		if (code === 0)    return "Clear sky";
		if (code === 1)    return "Mostly clear";
		if (code === 2)    return "Partly cloudy";
		if (code === 3)    return "Overcast";
		if (code <= 49)    return "Foggy";
		if (code <= 57)    return "Drizzle";
		if (code <= 67)    return "Rain";
		if (code <= 77)    return "Snow";
		if (code <= 82)    return "Rain showers";
		if (code <= 86)    return "Snow showers";
		if (code <= 99)    return "Thunderstorm";
		return "Unknown";
	}

	// -----------------------------------------------------------------------
	// Form Helpers
	// -----------------------------------------------------------------------

	function durationToHours(value) {
		const map = { "1h": 1, "2h": 2, "3h": 3, "half-day": 4.5, "full-day": 7.5 };
		return map[value] || 2;
	}

	function getSelectedRadio(radios) {
		for (let i = 0; i < radios.length; i++) {
			if (radios[i].checked) return radios[i].value;
		}
		return "twisties";
	}

	function handleModeToggle() {
		const mode = getSelectedRadio(dom.planModeRadios);
		if (dom.durationGroup) dom.durationGroup.hidden = mode === "distance";
		if (dom.distanceGroup) dom.distanceGroup.hidden = mode === "time";
	}

	// -----------------------------------------------------------------------
	// Loading State
	// -----------------------------------------------------------------------

	function setLoading(isLoading) {
		if (!dom.btnGenerate) return;
		dom.btnGenerate.disabled = isLoading;
		const btnText    = dom.btnGenerate.querySelector(".btn__text");
		const btnSpinner = dom.btnGenerate.querySelector(".btn__spinner");
		if (btnText)    btnText.textContent = isLoading ? "Generating..." : "Generate Route";
		if (btnSpinner) btnSpinner.hidden   = !isLoading;
	}

	// -----------------------------------------------------------------------
	// Error Helpers
	// -----------------------------------------------------------------------

	function showError(el, message) {
		if (!el) return;
		el.textContent = message;
		el.hidden      = false;
	}

	function clearError(el) {
		if (!el) return;
		el.textContent = "";
		el.hidden      = true;
	}

	function clearAllErrors() {
		clearError(dom.startError);
		clearError(dom.endError);
		clearError(dom.formError);
	}

	// -----------------------------------------------------------------------
	// Reset
	// -----------------------------------------------------------------------

	function handleReset() {
		if (dom.form) dom.form.reset();
		dom.startInput.value = "";
		if (dom.endInput) dom.endInput.value = "";

		state.startLatLng    = null;
		state.startAddress   = "";
		state.endLatLng      = null;
		state.endAddress     = "";
		state.currentRoute   = null;
		state.waypointLatLngs = [];

		if (state.routeLayer) {
			state.map.removeLayer(state.routeLayer);
			state.routeLayer = null;
		}

		clearRouteSummary();
		clearAllErrors();

		if (state.map) {
			const defaultCenter = {
				lat: parseFloat((rideloopData && rideloopData.defaultLat) || 52.0907),
				lng: parseFloat((rideloopData && rideloopData.defaultLng) || 5.1214),
			};
			state.map.setView([defaultCenter.lat, defaultCenter.lng], 7);
		}

		if (dom.startInput) dom.startInput.focus();
	}

	function clearRouteSummary() {
		if (dom.routeSummary)     dom.routeSummary.hidden     = true;
		if (dom.summaryDistance)  dom.summaryDistance.textContent  = "—";
		if (dom.summaryDuration)  dom.summaryDuration.textContent  = "—";
		if (dom.summaryWaypoints) dom.summaryWaypoints.textContent = "—";
		if (dom.waypointList)     dom.waypointList.innerHTML   = "";
		if (dom.filterTags)       dom.filterTags.innerHTML     = "";
		if (dom.poiList)          dom.poiList.innerHTML        = "";
		if (dom.poiSection) {
			dom.poiSection.hidden = true;
			const overflow = dom.poiSection.querySelector(".poi-overflow");
			const toggle   = dom.poiSection.querySelector(".poi-toggle");
			if (overflow) overflow.remove();
			if (toggle)   toggle.remove();
		}
		if (dom.btnOpenGmaps)     dom.btnOpenGmaps.href        = "#";
		if (dom.gmapsTip)         dom.gmapsTip.hidden          = true;
		if (dom.weatherSection)   dom.weatherSection.hidden    = true;
		if (dom.weatherContent)   dom.weatherContent.innerHTML = "";
		if (dom.elevationSection) dom.elevationSection.hidden  = true;
		if (dom.elevationChart)   dom.elevationChart.innerHTML = "";
		if (dom.elevationMin)     dom.elevationMin.textContent = "—";
		if (dom.elevationMax)     dom.elevationMax.textContent = "—";
		clearPoiMarkers();
	}

	// -----------------------------------------------------------------------
	// Random Route
	// -----------------------------------------------------------------------

	function handleRandom() {
		clearAllErrors();

		if (!state.startLatLng) {
			showError(dom.startError, "Enter a starting location first, then hit Random.");
			dom.startInput.focus();
			return;
		}

		const randomMode = Math.random() < 0.67 ? "time" : "distance";
		dom.planModeRadios.forEach(function (r) { r.checked = r.value === randomMode; });
		handleModeToggle();

		if (randomMode === "distance") {
			const distOptions = [50, 100, 100, 150, 150, 200, 250, 300, 400];
			if (dom.distanceInput) {
				dom.distanceInput.value =
					distOptions[Math.floor(Math.random() * distOptions.length)];
			}
		} else {
			const durations = ["1h", "2h", "2h", "3h", "3h", "half-day", "full-day"];
			dom.durationSelect.value =
				durations[Math.floor(Math.random() * durations.length)];
		}

		const roadPrefs = ["extra-curvy", "twisties", "twisties", "mixed"];
		const randomPref = roadPrefs[Math.floor(Math.random() * roadPrefs.length)];
		dom.roadPrefRadios.forEach(function (r) { r.checked = r.value === randomPref; });

		const sceneries = ["any", "any", "forest", "water", "heide"];
		const randomScenery = sceneries[Math.floor(Math.random() * sceneries.length)];
		dom.sceneryRadios.forEach(function (r) { r.checked = r.value === randomScenery; });

		const directions = ["any", "any", "any", "north", "east", "south", "west"];
		const randomDir  = directions[Math.floor(Math.random() * directions.length)];
		dom.directionRadios.forEach(function (r) { r.checked = r.value === randomDir; });

		generateRoute();
	}

	// -----------------------------------------------------------------------
	// Share
	// -----------------------------------------------------------------------

	function handleShare() {
		const url = dom.btnOpenGmaps ? dom.btnOpenGmaps.href : "";
		if (!url || url === "#") return;

		const shareData = {
			title: "RideLoop Route",
			text:  "Check out this motorcycle route I generated on RideLoop!",
			url:   url,
		};

		if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
			navigator.share(shareData).catch(function () {});
		} else {
			navigator.clipboard
				.writeText(url)
				.then(function () {
					const btn      = dom.btnShare;
					const original = btn.innerHTML;
					btn.textContent = "Copied!";
					btn.disabled    = true;
					setTimeout(function () {
						btn.innerHTML = original;
						btn.disabled  = false;
					}, 2000);
				})
				.catch(function () {});
		}
	}

	// -----------------------------------------------------------------------
	// Step Wizard Navigation
	// -----------------------------------------------------------------------

	let currentStep  = 1;
	const TOTAL_STEPS = 3;

	function goToStep(n) {
		if (n < 1 || n > TOTAL_STEPS) return;
		currentStep = n;

		document.querySelectorAll(".planner-step").forEach(function (panel) {
			panel.classList.toggle("is-active", parseInt(panel.dataset.step, 10) === n);
		});

		document.querySelectorAll(".step-nav__item").forEach(function (item) {
			const step = parseInt(item.dataset.step, 10);
			item.classList.remove("is-active", "is-done");
			if (step === n)      item.classList.add("is-active");
			else if (step < n)   item.classList.add("is-done");
		});
	}

	function initStepNav() {
		document.querySelectorAll(".btn-next").forEach(function (btn) {
			btn.addEventListener("click", function () { goToStep(currentStep + 1); });
		});
		document.querySelectorAll(".btn-back").forEach(function (btn) {
			btn.addEventListener("click", function () { goToStep(currentStep - 1); });
		});
		document.querySelectorAll(".step-nav__item").forEach(function (item) {
			item.addEventListener("click", function () {
				const step = parseInt(item.dataset.step, 10);
				if (step < currentStep) goToStep(step);
			});
		});
		goToStep(1);
	}

})();
