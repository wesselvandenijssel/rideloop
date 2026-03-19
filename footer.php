<footer class="site-footer" role="contentinfo">
    <div class="container">
        <div class="site-footer__inner">

            <div class="site-footer__brand">
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="site-footer__logo" rel="home">
                    <img src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/logo.svg' ); ?>" alt="<?php bloginfo( 'name' ); ?>" width="120" height="32" class="site-footer__logo-img">
                </a>
                <p class="site-footer__tagline">Plan the ride. Live the road.</p>
            </div>

            <nav class="site-footer__nav" aria-label="<?php esc_attr_e( 'Footer Navigation', 'rideloop' ); ?>">
                <ul>
                    <li><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Home</a></li>
                    <li><a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>">Planner</a></li>
                    <li><a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About</a></li>
                </ul>
            </nav>

        </div><!-- .site-footer__inner -->

        <div class="site-footer__bottom">
            <p>
                &copy; <?php echo esc_html( date( 'Y' ) ); ?>
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a>.
                <?php esc_html_e( 'Built for riders, by riders.', 'rideloop' ); ?>
            </p>
        </div>

    </div><!-- .container -->
</footer><!-- .site-footer -->

<?php wp_footer(); ?>
</body>
</html>
