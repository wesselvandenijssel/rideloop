/**
 * main.js — RideLoop general UI utilities
 *
 * Handles:
 *  - Mobile nav toggle (hamburger / aria-expanded)
 *  - Hero quick-start form: passes "start_location" as a query param
 *    so the planner page can pre-fill the location input
 *  - Smooth-scroll anchor links
 */

( function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Mobile Navigation Toggle
  // -----------------------------------------------------------------------
  const toggle = document.querySelector( '.site-header__toggle' );
  const mobileNav = document.getElementById( 'site-nav-mobile' );

  if ( toggle && mobileNav ) {
    toggle.addEventListener( 'click', function () {
      const isOpen = toggle.getAttribute( 'aria-expanded' ) === 'true';
      toggle.setAttribute( 'aria-expanded', String( ! isOpen ) );
      mobileNav.hidden = isOpen;
      document.body.classList.toggle( 'nav-open', ! isOpen );
    } );

    // Close mobile nav on outside click
    document.addEventListener( 'click', function ( e ) {
      if (
        mobileNav &&
        ! mobileNav.hidden &&
        ! mobileNav.contains( e.target ) &&
        ! toggle.contains( e.target )
      ) {
        toggle.setAttribute( 'aria-expanded', 'false' );
        mobileNav.hidden = true;
        document.body.classList.remove( 'nav-open' );
      }
    } );

    // Close on Escape key
    document.addEventListener( 'keydown', function ( e ) {
      if ( e.key === 'Escape' && ! mobileNav.hidden ) {
        toggle.setAttribute( 'aria-expanded', 'false' );
        mobileNav.hidden = true;
        document.body.classList.remove( 'nav-open' );
        toggle.focus();
      }
    } );
  }

  // -----------------------------------------------------------------------
  // Hero Quick-Start Form
  // Pre-fills the planner page input if a "start_location" param is present.
  // The hero form already submits via GET to the planner page URL, so the
  // param arrives automatically — no extra JS needed for the hero itself.
  //
  // Here we read the URL param on the planner page and set the input value.
  // (The planner.js file handles Google Places autocomplete setup, so we only
  //  pre-fill the raw text here; the full geocoding happens after the user
  //  hits "Generate".)
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // Hero Autocomplete — Google Maps callback for the front-page hero input
  // -----------------------------------------------------------------------
  window.rideloopInitHero = function () {
    const input = document.getElementById( 'hero-location' );
    if ( ! input ) return;

    if ( ! ( window.google && google.maps && google.maps.places && google.maps.places.PlaceAutocompleteElement ) ) {
      return; // API not ready or PlaceAutocompleteElement unavailable — leave raw input as-is
    }

    const placeAutoEl       = new google.maps.places.PlaceAutocompleteElement();
    placeAutoEl.placeholder = input.placeholder;

    // Insert the web component before the original input, then hide the input.
    // The input keeps name="start_location" so the form GET submission works.
    input.parentElement.insertBefore( placeAutoEl, input );
    input.hidden = true;

    // When the user picks a suggestion, sync immediately (sync write first so
    // the hidden input is correct even if the form submits right away), then
    // try to upgrade to the full formatted address via fetchFields (async).
    placeAutoEl.addEventListener( 'gmp-placeselect', async function ( event ) {
      input.value = placeAutoEl.value || '';  // sync — covers immediate form submit
      try {
        await event.place.fetchFields( { fields: [ 'formattedAddress', 'displayName' ] } );
        input.value = event.place.formattedAddress ||
                      ( event.place.displayName && event.place.displayName.text ) ||
                      placeAutoEl.value || '';
      } catch ( e ) { /* input.value already set above */ }
    } );

    // Keep hidden input in sync while the user types.
    placeAutoEl.addEventListener( 'input', function () {
      input.value = placeAutoEl.value;
    } );

    // Final safety net on submit: always read the element's current display value.
    const form = input.closest( 'form' );
    if ( form ) {
      form.addEventListener( 'submit', function () {
        input.value = placeAutoEl.value || input.value;
      } );
    }
  };

  // -----------------------------------------------------------------------
  // Smooth Scroll — for anchor links within the same page
  // -----------------------------------------------------------------------
  document.querySelectorAll( 'a[href^="#"]' ).forEach( function ( anchor ) {
    anchor.addEventListener( 'click', function ( e ) {
      const targetId = this.getAttribute( 'href' ).slice( 1 );
      const target = document.getElementById( targetId );
      if ( target ) {
        e.preventDefault();
        target.scrollIntoView( { behavior: 'smooth', block: 'start' } );
      }
    } );
  } );

} )();
