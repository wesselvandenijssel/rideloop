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
  const params = new URLSearchParams( window.location.search );
  const startParam = params.get( 'start_location' );

  if ( startParam ) {
    // If we're on the planner page and a location was passed from the hero
    const plannerInput = document.getElementById( 'planner-start' );
    if ( plannerInput ) {
      plannerInput.value = decodeURIComponent( startParam );
    }
  }

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
