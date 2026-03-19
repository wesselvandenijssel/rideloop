<footer class="site-footer" role="contentinfo">
    <div class="container">

        <div class="site-footer__inner">

            <!-- Brand col -->
            <div class="site-footer__brand">
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="site-footer__logo-link" rel="home">
                    <img src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/logo.svg' ); ?>" alt="<?php bloginfo( 'name' ); ?>" width="120" height="32" class="site-footer__logo-img">
                </a>
                <p class="site-footer__tagline">Plan the ride. Live the road.</p>
                <p class="site-footer__desc">Generate scenic round-trip motorcycle routes in seconds. No account needed.</p>
            </div>

            <!-- Links col -->
            <div class="site-footer__col">
                <h3 class="site-footer__col-title">Navigate</h3>
                <nav aria-label="<?php esc_attr_e( 'Footer Navigation', 'rideloop' ); ?>">
                    <ul class="site-footer__nav">
                        <li><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Home</a></li>
                        <li><a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>">Route Planner</a></li>
                        <li><a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About</a></li>
                    </ul>
                </nav>
            </div>

            <!-- CTA col -->
            <div class="site-footer__col">
                <h3 class="site-footer__col-title">Ready to ride?</h3>
                <p class="site-footer__cta-desc">Build your perfect loop in under a minute.</p>
                <a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>" class="btn btn--primary site-footer__cta-btn">
                    Open the Planner
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </a>
            </div>

        </div><!-- .site-footer__inner -->

        <div class="site-footer__bottom">
            <p class="site-footer__copy">
                &copy; <?php echo esc_html( date( 'Y' ) ); ?>
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a>
                &mdash; <?php esc_html_e( 'Built for riders, by riders.', 'rideloop' ); ?>
            </p>
            <p class="site-footer__legal">
                Powered by Google Maps &middot; Routes are suggestions only &mdash; always ride safely.
            </p>
        </div>

    </div><!-- .container -->
</footer><!-- .site-footer -->

<?php wp_footer(); ?>
</body>
</html>
