<?php
/**
 * 404.php — Not Found template
 *
 * Branded 404 page that maintains the RideLoop identity.
 */

get_header();
?>

<main id="main-content" class="site-main error-404" role="main">
    <div class="container">
        <div class="error-404__inner">

            <!-- Large 404 graphic -->
            <div class="error-404__graphic" aria-hidden="true">
                <span class="error-404__code">404</span>
                <svg class="error-404__icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
                    <path d="M3 12a9 9 0 1018 0A9 9 0 003 12z"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
            </div>

            <h1 class="error-404__title"><?php esc_html_e( 'Wrong turn.', 'rideloop' ); ?></h1>
            <p class="error-404__message">
                <?php esc_html_e( "Looks like this road doesn't exist. The page you're looking for has moved, been removed, or never existed.", 'rideloop' ); ?>
            </p>

            <div class="error-404__actions">
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn btn--primary btn--lg">
                    <?php esc_html_e( 'Go Home', 'rideloop' ); ?>
                </a>
                <a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>" class="btn btn--outline btn--lg">
                    <?php esc_html_e( 'Plan a Ride', 'rideloop' ); ?>
                </a>
            </div>

        </div><!-- .error-404__inner -->
    </div><!-- .container -->
</main>

<?php get_footer(); ?>
