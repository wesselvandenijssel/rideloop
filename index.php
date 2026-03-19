<?php
/**
 * index.php — Main template file
 *
 * Used as a fallback when no more specific template matches.
 * For RideLoop, the front page uses front-page.php, so this
 * handles any blog-style listing if needed.
 */

get_header();
?>

<main id="main-content" class="site-main" role="main">
    <div class="container">

        <?php if ( have_posts() ) : ?>

            <header class="page-header">
                <h1 class="page-title">
                    <?php
                    if ( is_home() && ! is_front_page() ) {
                        single_post_title();
                    } elseif ( is_archive() ) {
                        the_archive_title();
                    } else {
                        esc_html_e( 'Posts', 'rideloop' );
                    }
                    ?>
                </h1>
            </header>

            <div class="post-grid">
                <?php while ( have_posts() ) : the_post(); ?>
                    <article id="post-<?php the_ID(); ?>" <?php post_class( 'post-card' ); ?>>
                        <header class="post-card__header">
                            <h2 class="post-card__title">
                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                            </h2>
                            <div class="post-card__meta">
                                <time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>">
                                    <?php echo esc_html( get_the_date() ); ?>
                                </time>
                            </div>
                        </header>
                        <div class="post-card__excerpt">
                            <?php the_excerpt(); ?>
                        </div>
                        <a href="<?php the_permalink(); ?>" class="btn btn--outline">Read More</a>
                    </article>
                <?php endwhile; ?>
            </div><!-- .post-grid -->

            <?php the_posts_pagination(); ?>

        <?php else : ?>

            <div class="no-content">
                <h2><?php esc_html_e( 'Nothing found.', 'rideloop' ); ?></h2>
                <p><?php esc_html_e( 'It looks like nothing was found at this location.', 'rideloop' ); ?></p>
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn btn--primary">Go Home</a>
            </div>

        <?php endif; ?>

    </div><!-- .container -->
</main>

<?php get_footer(); ?>
