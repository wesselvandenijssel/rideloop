<footer class="site-footer" role="contentinfo">
    <div class="container">

        <div class="site-footer__inner">

            <!-- Brand col -->
            <div class="site-footer__brand">
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="site-footer__logo-link" rel="home">
                    <img src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/logo.svg' ); ?>" alt="<?php bloginfo( 'name' ); ?>" width="120" height="32" class="site-footer__logo-img">
                </a>
                <p class="site-footer__tagline"><?php esc_html_e( 'Plan the ride. Live the road.', 'rideloop' ); ?></p>
                <p class="site-footer__desc"><?php esc_html_e( 'Generate scenic round-trip motorcycle routes in seconds. No account needed.', 'rideloop' ); ?></p>
            </div>

            <!-- Links col -->
            <div class="site-footer__col">
                <h3 class="site-footer__col-title"><?php esc_html_e( 'Navigate', 'rideloop' ); ?></h3>
                <nav aria-label="<?php esc_attr_e( 'Footer Navigation', 'rideloop' ); ?>">
                    <ul class="site-footer__nav">
                        <li><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Home', 'rideloop' ); ?></a></li>
                        <li><a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>"><?php esc_html_e( 'Route Planner', 'rideloop' ); ?></a></li>
                        <li><a href="<?php echo esc_url( home_url( '/about/' ) ); ?>"><?php esc_html_e( 'About', 'rideloop' ); ?></a></li>
                        <li><a href="<?php echo esc_url( rideloop_get_contact_url() ); ?>"><?php esc_html_e( 'Contact', 'rideloop' ); ?></a></li>
                    </ul>
                </nav>
            </div>

            <!-- CTA col -->
            <div class="site-footer__col">
                <h3 class="site-footer__col-title"><?php esc_html_e( 'Ready to ride?', 'rideloop' ); ?></h3>
                <p class="site-footer__cta-desc"><?php esc_html_e( 'Build your perfect loop in under a minute.', 'rideloop' ); ?></p>
                <a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>" class="btn btn--primary site-footer__cta-btn">
                    <?php esc_html_e( 'Open the Planner', 'rideloop' ); ?>
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
                <?php esc_html_e( 'Powered by Google Maps · Routes are suggestions only — always ride safely.', 'rideloop' ); ?>
            </p>
        </div>

    </div><!-- .container -->
</footer><!-- .site-footer -->

<?php wp_footer(); ?>
</body>
</html>
