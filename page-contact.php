<?php
/**
 * Template Name: Contact
 *
 * page-contact.php — Contact page.
 */

get_header();
?>

<main id="main-content" class="site-main contact-page" role="main">

    <div class="contact-hero">
        <div class="container">
            <h1 class="contact-hero__title"><?php esc_html_e( 'Get in touch', 'rideloop' ); ?></h1>
            <p class="contact-hero__subtitle"><?php esc_html_e( "Questions, feedback, or just want to share your favourite route? Reach out — we'd love to hear from you.", 'rideloop' ); ?></p>
        </div>
    </div>

    <div class="container">
        <div class="contact-layout">

            <div class="contact-card">
                <div class="contact-card__icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                    </svg>
                </div>
                <h2 class="contact-card__title"><?php esc_html_e( 'Email us', 'rideloop' ); ?></h2>
                <p class="contact-card__desc"><?php esc_html_e( "Send us a message and we'll get back to you as soon as possible.", 'rideloop' ); ?></p>
                <a href="mailto:rideloop@wesselvandenijssel.nl" class="contact-card__email">
                    rideloop@wesselvandenijssel.nl
                </a>
            </div>

            <div class="contact-card">
                <div class="contact-card__icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h2 class="contact-card__title"><?php esc_html_e( 'What can we help with?', 'rideloop' ); ?></h2>
                <ul class="contact-card__list">
                    <li><?php esc_html_e( 'Bug reports or route issues', 'rideloop' ); ?></li>
                    <li><?php esc_html_e( 'Feature suggestions', 'rideloop' ); ?></li>
                    <li><?php esc_html_e( 'Feedback on your experience', 'rideloop' ); ?></li>
                    <li><?php esc_html_e( 'General questions about RideLoop', 'rideloop' ); ?></li>
                </ul>
            </div>

        </div><!-- .contact-layout -->
    </div>

</main>

<?php get_footer(); ?>
