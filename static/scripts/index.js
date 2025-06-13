// Smooth scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show about information
// function showAbout() {
// }

function showSidebar() {
    document.getElementById('sidebar').classList.add('active');
    document.querySelector('sidebar-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.querySelector('sidebar-overlay').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Show info
function showInfo() {
    document.getElementById('sliderTitle').textContent = 'Information about project';
    document.getElementById('sliderContent').textContent = `
        <h3> About Cyborg ID </h3>
        <p>CyborgID uses cutting-edge AI technology to create unique digital personalities</p>
    `;
    showSidebar();
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