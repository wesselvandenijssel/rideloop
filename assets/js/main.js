/**
 * main.js — RideLoop general UI utilities
 *
 * Handles:
 *  - Mobile nav toggle (hamburger / aria-expanded)
 *  - Hero quick-start form: passes "start_location" as a query param
 *    so the planner page can pre-fill the location input
 *  - Hero location autocomplete via Photon (Komoot / OSM-based, free)
 *  - Smooth-scroll anchor links
 */

( function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Mobile Navigation Toggle
  // -----------------------------------------------------------------------
  const toggle    = document.querySelector( '.site-header__toggle' );
  const mobileNav = document.getElementById( 'site-nav-mobile' );

  if ( toggle && mobileNav ) {
    toggle.addEventListener( 'click', function () {
      const isOpen = toggle.getAttribute( 'aria-expanded' ) === 'true';
      toggle.setAttribute( 'aria-expanded', String( ! isOpen ) );
      mobileNav.hidden = isOpen;
      document.body.classList.toggle( 'nav-open', ! isOpen );
    } );

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
  // Hero Autocomplete — Photon (OSM-based, free)
  // -----------------------------------------------------------------------
  const heroInput = document.getElementById( 'hero-location' );
  if ( heroInput ) {
    initPhotonAutocomplete( heroInput );
  }

  /**
   * Attach a Photon suggestion dropdown to a text input.
   * Selecting a suggestion sets the input value (label text only — the form
   * submits it as start_location= and the planner geocodes it on load).
   */
  function initPhotonAutocomplete( input ) {
    const wrapper = input.parentElement;
    wrapper.style.position = 'relative';

    const dropdown = document.createElement( 'ul' );
    dropdown.className = 'autocomplete-dropdown';
    dropdown.setAttribute( 'role', 'listbox' );
    dropdown.hidden = true;
    wrapper.appendChild( dropdown );

    let debounceTimer = null;
    let activeIndex   = -1;

    function closeDropdown() {
      dropdown.hidden = true;
      dropdown.innerHTML = '';
      activeIndex = -1;
    }

    function setActive( index ) {
      const items = dropdown.querySelectorAll( 'li' );
      items.forEach( function ( li, i ) {
        li.classList.toggle( 'is-active', i === index );
      } );
      activeIndex = index;
    }

    function pickItem( label ) {
      input.value = label;
      closeDropdown();
    }

    input.addEventListener( 'input', function () {
      clearTimeout( debounceTimer );
      const q = input.value.trim();
      if ( q.length < 3 ) { closeDropdown(); return; }

      debounceTimer = setTimeout( function () {
        fetch(
          'https://photon.komoot.io/api/?q=' + encodeURIComponent( q ) + '&limit=5',
          { headers: { Accept: 'application/json' } }
        )
          .then( function ( r ) { return r.json(); } )
          .then( function ( data ) {
            dropdown.innerHTML = '';
            activeIndex = -1;
            if ( ! data.features || data.features.length === 0 ) {
              closeDropdown();
              return;
            }
            data.features.forEach( function ( feature ) {
              const label = buildPhotonLabel( feature.properties );
              const li    = document.createElement( 'li' );
              li.setAttribute( 'role', 'option' );
              li.textContent = label;
              li.addEventListener( 'mousedown', function ( e ) {
                e.preventDefault();
                pickItem( label );
              } );
              dropdown.appendChild( li );
            } );
            dropdown.hidden = false;
          } )
          .catch( function () { closeDropdown(); } );
      }, 300 );
    } );

    input.addEventListener( 'keydown', function ( e ) {
      const items = dropdown.querySelectorAll( 'li' );
      if ( e.key === 'ArrowDown' ) {
        e.preventDefault();
        setActive( Math.min( activeIndex + 1, items.length - 1 ) );
      } else if ( e.key === 'ArrowUp' ) {
        e.preventDefault();
        setActive( Math.max( activeIndex - 1, 0 ) );
      } else if ( e.key === 'Enter' && activeIndex >= 0 ) {
        e.preventDefault();
        items[ activeIndex ].dispatchEvent( new MouseEvent( 'mousedown' ) );
      } else if ( e.key === 'Escape' ) {
        closeDropdown();
      }
    } );

    input.addEventListener( 'blur', function () {
      setTimeout( closeDropdown, 150 );
    } );
  }

  function buildPhotonLabel( props ) {
    const parts = [];
    if ( props.name ) parts.push( props.name );
    if ( props.street && props.housenumber ) parts.push( props.street + ' ' + props.housenumber );
    else if ( props.street ) parts.push( props.street );
    if ( props.city && props.city !== props.name ) parts.push( props.city );
    if ( props.country ) parts.push( props.country );
    return parts.join( ', ' );
  }

  // -----------------------------------------------------------------------
  // Smooth Scroll — anchor links within the same page
  // -----------------------------------------------------------------------
  document.querySelectorAll( 'a[href^="#"]' ).forEach( function ( anchor ) {
    anchor.addEventListener( 'click', function ( e ) {
      const targetId = this.getAttribute( 'href' ).slice( 1 );
      const target   = document.getElementById( targetId );
      if ( target ) {
        e.preventDefault();
        target.scrollIntoView( { behavior: 'smooth', block: 'start' } );
      }
    } );
  } );

} )();
