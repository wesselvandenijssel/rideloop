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
            <h1 class="page-hero__title">About RideLoop</h1>
            <p class="page-hero__subtitle">Why we built it, and what's ahead.</p>
        </div>
    </div>

    <div class="container">
        <div class="content-narrow">

            <section class="about-section">
                <h2>Built for riders, by riders</h2>
                <p>
                    RideLoop started with a simple frustration: planning a good motorcycle route
                    takes forever. You open Google Maps, drop a few pins, realize the route goes
                    through suburbs, redo it, and twenty minutes later you still haven't left the
                    driveway.
                </p>
                <p>
                    We wanted a tool that understands what motorcyclists actually want — scenic
                    roads, twisting curves, minimal stop-and-go — and generates a ready-to-ride
                    round-trip loop in seconds. Enter a starting point, set a duration, and go.
                </p>
            </section>

            <section class="about-section">
                <h2>How the route generation works</h2>
                <p>
                    RideLoop uses <strong>OSRM</strong> (Open Source Routing Machine) and
                    <strong>OpenStreetMap</strong> to calculate routes. When you select
                    "Twisties / Scenic," we bias the waypoints away from major highways and toward
                    rural and secondary roads. When you choose "Highways," we optimize for speed.
                    The result is always a closed loop — you end exactly where you started.
                </p>
                <p>
                    Once your route is generated, you can export it directly to Google Maps with
                    all waypoints encoded in the URL — no account required, works on any device,
                    compatible with Android Auto and CarPlay.
                </p>
            </section>

            <section class="about-section">
                <h2>Privacy</h2>
                <p>
                    RideLoop runs entirely client-side. Your location is used only to center
                    the map and pre-fill the starting address — it is never stored on our servers.
                    All routing is handled directly between your browser and open routing services.
                </p>
            </section>

            <div class="about-cta">
                <a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>" class="btn btn--primary btn--lg">
                    Try the Planner
                </a>
            </div>

        </div><!-- .content-narrow -->
    </div><!-- .container -->

</main>

<?php get_footer(); ?>
