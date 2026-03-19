<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="site-header" role="banner">
    <div class="container">
        <div class="site-header__inner">

            <!-- Logo / Site Identity -->
            <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="site-header__logo" rel="home" aria-label="<?php bloginfo( 'name' ); ?> — Home">
                <img src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/logo.svg' ); ?>" alt="<?php bloginfo( 'name' ); ?>" width="140" height="36">
            </a>

            <!-- Primary Navigation -->
            <nav class="site-nav" role="navigation" aria-label="<?php esc_attr_e( 'Primary Menu', 'rideloop' ); ?>">
                <?php
                wp_nav_menu( [
                    'theme_location' => 'primary',
                    'container'      => false,
                    'menu_class'     => 'site-nav__menu',
                    'fallback_cb'    => 'rideloop_fallback_menu',
                ] );
                ?>
            </nav>

            <!-- CTA Button -->
            <a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>" class="btn btn--primary site-header__cta">
                Plan a Ride
            </a>

            <!-- Mobile Menu Toggle -->
            <button class="site-header__toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="site-nav-mobile">
                <span class="hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </button>

        </div><!-- .site-header__inner -->
    </div><!-- .container -->

    <!-- Mobile Navigation (mirrored, shown below header on small screens) -->
    <div class="site-header__mobile-nav" id="site-nav-mobile" hidden>
        <?php
        wp_nav_menu( [
            'theme_location' => 'primary',
            'container'      => false,
            'menu_class'     => 'site-nav__mobile-menu',
            'fallback_cb'    => 'rideloop_fallback_menu',
        ] );
        ?>
        <a href="<?php echo esc_url( rideloop_get_planner_url() ); ?>" class="btn btn--primary btn--full">Plan a Ride</a>
    </div>

</header><!-- .site-header -->

<?php
/**
 * Fallback menu — shown when no menu is assigned to the primary location.
 * Renders a minimal set of links so the nav isn't empty.
 */
function rideloop_fallback_menu() {
    echo '<ul class="site-nav__menu">';
    echo '<li><a href="' . esc_url( home_url( '/' ) ) . '">Home</a></li>';
    echo '<li><a href="' . esc_url( home_url( '/planner/' ) ) . '">Planner</a></li>';
    echo '<li><a href="' . esc_url( home_url( '/about/' ) ) . '">About</a></li>';
    echo '</ul>';
}
?>
