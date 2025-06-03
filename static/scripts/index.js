// Smooth scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show about information
function showAbout() {
    alert('CyborgID - The future of digital identity creation. Transform yourself into a unique digital avatar.');
}

// Show info
function showInfo() {
    alert('Create stunning avatars with AI-powered technology. Join the digital revolution today!');
}

// Add loading effect
window.addEventListener('load', function() {
    document.body.style.opacity = '1';
});

// Optimize video loading
document.addEventListener('DOMContentLoaded', function() {
    const video = document.querySelector('video');
    if (video) {
        video.addEventListener('loadstart', function() {
            console.log('Video loading started');
        });
        
        video.addEventListener('canplay', function() {
            console.log('Video ready to play');
        });
        
        video.addEventListener('error', function(e) {
            console.error('Video loading error:', e);
            // Fallback: hide video container or show alternative content
            this.parentElement.style.background = 'linear-gradient(135deg, #000428, #004e92)';
        });
    }
});

// Performance optimization: Pause video when tab is not visible
document.addEventListener('visibilitychange', function() {
    const video = document.querySelector('video');
    if (video) {
        if (document.hidden) {
            video.pause();
        } else {
            video.play();
        }
    }
});