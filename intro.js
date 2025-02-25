document.addEventListener('DOMContentLoaded', () => {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const totalSlides = slides.length;

    // Initialize slide transitions
    function showSlide(index) {
        // Hide all slides
        slides.forEach(slide => {
            slide.classList.remove('active');
            slide.style.opacity = 0;
            slide.style.transform = 'translateY(20px)';
        });
        
        // Show the current slide with transition
        setTimeout(() => {
            slides[index].classList.add('active');
            slides[index].style.opacity = 1;
            slides[index].style.transform = 'translateY(0)';
        }, 50);
        
        // Update dots
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        // Update button states
        prevButton.disabled = index === 0;
        
        if (index === totalSlides - 1) {
            nextButton.textContent = 'Get Started';
        } else {
            nextButton.textContent = 'Next';
        }
    }

    // Add feature toggle functionality for accordion
    document.querySelectorAll('.feature-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            
            // Close all other items
            document.querySelectorAll('.feature-item').forEach(other => {
                if (other !== item) {
                    other.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // Handle sign in button
    const signinButton = document.querySelector('.signin-button');
    if (signinButton) {
        signinButton.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://koombiyodelivery.lk/sign' });
        });
    }

    // Update login status
    function checkLoginStatus() {
        chrome.cookies.get({ url: 'https://koombiyodelivery.lk', name: 'session' }, cookie => {
            const statusElement = document.querySelector('.login-status');
            if (statusElement) {
                if (cookie) {
                    statusElement.innerHTML = '✅ Logged in';
                    statusElement.style.color = '#22c55e';
                } else {
                    statusElement.innerHTML = '❌ Not logged in';
                }
            }
        });
    }
    
    // Check if intro was already shown
    chrome.storage.local.get(['introShown'], (result) => {
        if (result.introShown) {
            window.location.href = 'popup.html';
        } else {
            checkLoginStatus();
        }
    });

    // Add click events to navigation buttons
    nextButton.addEventListener('click', () => {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            showSlide(currentSlide);
        } else {
            completeIntro();
        }
    });

    prevButton.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            showSlide(currentSlide);
        }
    });
    
    // Make dots clickable
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });

    // Handle completion of intro
    function completeIntro() {
        chrome.storage.local.set({ introShown: true });
        chrome.action.setPopup({ popup: 'popup.html' });
        window.location.href = 'popup.html';
    }
    
    // Initialize the first slide
    showSlide(currentSlide);
    
    // Add transition animations to elements
    const animateItems = document.querySelectorAll('.brand-slide *[class]');
    animateItems.forEach((item, index) => {
        item.style.opacity = 0;
        item.style.transform = 'translateY(20px)';
        setTimeout(() => {
            item.style.transition = 'all 0.5s ease';
            item.style.opacity = 1;
            item.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
});