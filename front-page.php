<?php
/**
 * front-page.php — Homepage template
 *
 * Hero section with the route planner form front and center.
 * Also includes a features strip and a CTA section.
 */

get_header();
?>

<main id="main-content" class="site-main" role="main">

    <!-- ================================================================
         HERO SECTION
         Full-width dark hero with headline and quick-start planner form
         ================================================================ -->
    <section class="hero" aria-labelledby="hero-heading">
        <div class="hero__bg-overlay" aria-hidden="true"></div>
        <div class="container">
            <div class="hero__content">

                <div class="hero__badge">Motorcycle Route Planner</div>

                <h1 id="hero-heading" class="hero__title">
                    Your next great ride <br>
                    <span class="text-accent">starts here.</span>
                </h1>

                <p class="hero__subtitle">
                    Enter a starting point, pick your style, and RideLoop generates
                    a scenic round-trip route you can send straight to Google Maps.
                </p>

                <!-- Quick-start form — redirects to full planner page -->
                <form class="hero__form" id="hero-quick-form" action="<?php echo esc_url( rideloop_get_planner_url() ); ?>" method="get">
                    <div class="hero__form-group">
                        <label for="hero-location" class="sr-only">Starting Location</label>
                        <input
                            type="text"
                            id="hero-location"
                            name="start_location"
                            class="hero__input"
                            placeholder="Enter your starting location..."
                            autocomplete="off"
                        >
                        <button type="submit" class="btn btn--primary hero__form-btn">
                            Generate Route
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                    <p class="hero__form-hint">No account needed. Free to use.</p>
                </form>

            </div><!-- .hero__content -->
        </div><!-- .container -->
    </section><!-- .hero -->


    <!-- ================================================================
         FEATURES STRIP
         Three feature callouts below the hero
         ================================================================ -->
    <section class="features" aria-labelledby="features-heading">
        <div class="container">
            <h2 id="features-heading" class="sr-only">How RideLoop Works</h2>
            <div class="features__grid">

                <div class="feature-card">
                    <div class="feature-card__icon" aria-hidden="true">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                        </svg>
                    </div>
                    <h3 class="feature-card__title">Set Your Start</h3>
                    <p class="feature-card__desc">
                        Type any address or use your current location. RideLoop auto-detects
                        where you are to save time.
                    </p>
                </div>

                <div class="feature-card">
                    <div class="feature-card__icon" aria-hidden="true">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                        </svg>
                    </div>
                    <h3 class="feature-card__title">Pick Your Vibe</h3>
                    <p class="feature-card__desc">
                        Choose trip duration and road preference — twisties, highways, or mixed.
                        Avoid tolls, ferries, or unpaved roads.
                    </p>
                </div>

                <div class="feature-card">
                    <div class="feature-card__icon" aria-hidden="true">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                    </div>
                    <h3 class="feature-card__title">Ride the Loop</h3>
                    <p class="feature-card__desc">
                        Get a full round-trip route drawn on an interactive map, then export
                        it straight to Google Maps with one tap.
                    </p>
                </div>

            </div><!-- .features__grid -->
        </div><!-- .container -->
    </section><!-- .features -->


    <!-- ================================================================
         HOW IT WORKS — numbered steps
         ================================================================ -->
    <section class="how-it-works" aria-labelledby="hiw-heading">
        <div class="container">

            <header class="section-header">
                <h2 id="hiw-heading" class="section-header__title">How It Works</h2>
                <p class="section-header__subtitle">Three steps to your next adventure.</p>
            </header>

            <ol class="steps">
                <li class="step">
                    <div class="step__number" aria-hidden="true">01</div>
                    <div class="step__content">
                        <h3 class="step__title">Enter a starting point</h3>
                        <p class="step__desc">Type in an address, a town, or use your GPS location. RideLoop uses Google Places to autocomplete as you type.</p>
                    </div>
                </li>
                <li class="step">
                    <div class="step__number" aria-hidden="true">02</div>
                    <div class="step__content">
                        <h3 class="step__title">Choose your preferences</h3>
                        <p class="step__desc">Set how long you want to ride, whether you want curvy backroads or smooth highways, and any roads to avoid.</p>
                    </div>
                </li>
                <li class="step">
                    <div class="step__number" aria-hidden="true">03</div>
                    <div class="step__content">
                        <h3 class="step__title">Generate &amp; export</h3>
                        <p class="step__desc">RideLoop builds your loop and displays it on an interactive map. Hit "Open in Google Maps" to ride — it works with Android Auto and Apple CarPlay.</p>
                    </div>
                </li>
            </ol>

        </div><!-- .container -->
    </section><!-- .how-it-works -->


    <!-- ================================================================
         CTA BANNER
         ================================================================ -->
    <section class="cta-banner" aria-labelledby="cta-heading">
        <div class="container">
            <h2 id="cta-heading" class="cta-banner__title">Ready to ride?</h2>
            <p class="cta-banner__subtitle">Generate your first loop in under a minute — no account, no downloads.</p>
            <a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>" class="btn btn--primary btn--lg">Open the Planner</a>
        </div>
    </section>

</main>

<?php get_footer(); ?>
