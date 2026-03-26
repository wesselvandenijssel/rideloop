<?php
/**
 * Template Name: About
 *
 * page-about.php — Simple about page for the RideLoop theme.
 */

get_header();
?>

<main id="main-content" class="site-main" role="main">

    <!-- Page Hero -->
    <div class="page-hero page-hero--light">
        <div class="container">
            <h1 class="page-hero__title"><?php esc_html_e( 'About RideLoop', 'rideloop' ); ?></h1>
            <p class="page-hero__subtitle"><?php esc_html_e( "Why we built it, and what's ahead.", 'rideloop' ); ?></p>
        </div>
    </div>

    <div class="container">
        <div class="content-narrow">

            <section class="about-section">
                <h2><?php esc_html_e( 'Built for riders, by riders', 'rideloop' ); ?></h2>
                <p>
                    <?php esc_html_e( 'RideLoop started with a simple frustration: planning a good motorcycle route takes forever. You open Google Maps, drop a few pins, realize the route goes through suburbs, redo it, and twenty minutes later you still haven\'t left the driveway.', 'rideloop' ); ?>
                </p>
                <p>
                    <?php esc_html_e( 'We wanted a tool that understands what motorcyclists actually want — scenic roads, twisting curves, minimal stop-and-go — and generates a ready-to-ride round-trip loop in seconds. Enter a starting point, set a duration, and go.', 'rideloop' ); ?>
                </p>
            </section>

            <section class="about-section">
                <h2><?php esc_html_e( 'How the route generation works', 'rideloop' ); ?></h2>
                <p>
                    <?php
                    printf(
                        /* translators: %s is the product name "Google Maps Directions API" */
                        esc_html__( 'RideLoop uses the %s to calculate routes. When you select "Twisties / Scenic," we bias the waypoints away from major highways and toward rural and secondary roads. When you choose "Highways," we optimize for speed. The result is always a closed loop — you end exactly where you started.', 'rideloop' ),
                        '<strong>Google Maps Directions API</strong>'
                    );
                    ?>
                </p>
                <p>
                    <?php esc_html_e( 'Once your route is generated, you can export it directly to Google Maps with all waypoints encoded in the URL — no account required, works on any device, compatible with Android Auto and CarPlay.', 'rideloop' ); ?>
                </p>
            </section>

            <section class="about-section">
                <h2><?php esc_html_e( 'Privacy', 'rideloop' ); ?></h2>
                <p>
                    <?php esc_html_e( 'RideLoop runs entirely client-side. Your location is used only to center the map and pre-fill the starting address — it is never stored on our servers. All routing is handled directly between your browser and Google Maps.', 'rideloop' ); ?>
                </p>
            </section>

            <div class="about-cta">
                <a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>" class="btn btn--primary btn--lg">
                    <?php esc_html_e( 'Try the Planner', 'rideloop' ); ?>
                </a>
            </div>

        </div><!-- .content-narrow -->
    </div><!-- .container -->

</main>

<?php get_footer(); ?>
