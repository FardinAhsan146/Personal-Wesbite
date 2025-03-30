// Function to populate content from the site data
function populateContent() {
    // Populate navigation
    populateNavigation(siteData.navigation);
    
    // Populate about section
    populateAbout(siteData.about);
    
    // Populate tech stack
    populateTechStack(siteData.tech_stack);
    
    // Populate projects
    populateProjects(siteData.projects);
    
    // Populate writing section
    populateWriting(siteData.writing);
    
    // Populate Instagram section
    populateInstagram(siteData.instagram);
    
    // Populate contact section
    populateContact(siteData.contact);
    
    // Populate footer
    populateFooter(siteData.social, siteData.site);
    
    // Initialize animations after content is loaded
    initAnimations();
}

// Populate navigation
function populateNavigation(navItems) {
    const navContainer = document.getElementById('main-nav');
    if (!navContainer || !navItems) return;
    
    navContainer.innerHTML = '';
    
    navItems.forEach(item => {
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = item.name;
        link.classList.add('nav-link');
        navContainer.appendChild(link);
    });
}

// Populate about section
function populateAbout(aboutData) {
    if (!aboutData) return;
    
    // Set about title and description
    document.querySelector('#about .section-title').textContent = aboutData.title;
    document.querySelector('#about .about-text p').textContent = aboutData.description;
    
    // Populate photo slider
    const sliderTrack = document.querySelector('.slider-track');
    const sliderDots = document.querySelector('.slider-dots');
    
    if (sliderTrack && sliderDots && aboutData.photos) {
        sliderTrack.innerHTML = '';
        sliderDots.innerHTML = '';
        
        aboutData.photos.forEach((photo, index) => {
            // Create slide
            const slide = document.createElement('div');
            slide.className = 'slide';
            
            // Create image with error handling
            const img = document.createElement('img');
            img.src = photo.image;
            img.alt = photo.title;
            img.loading = 'lazy';
            
            // Add error handling for images
            img.onerror = function() {
                console.error(`Failed to load image: ${photo.image}`);
                // Set a fallback image or placeholder
                this.src = 'https://via.placeholder.com/400x400?text=Image+Not+Found';
                this.alt = 'Image not found';
            };
            
            // Create caption container
            const captionContainer = document.createElement('div');
            captionContainer.className = 'caption-container';
            
            // Create caption title
            const captionTitle = document.createElement('h4');
            captionTitle.textContent = photo.title;
            
            // Create caption text
            const captionText = document.createElement('p');
            captionText.textContent = photo.caption;
            
            // Append elements
            captionContainer.appendChild(captionTitle);
            captionContainer.appendChild(captionText);
            slide.appendChild(img);
            slide.appendChild(captionContainer);
            sliderTrack.appendChild(slide);
            
            // Create dot
            const dot = document.createElement('span');
            dot.className = index === 0 ? 'dot active' : 'dot';
            dot.setAttribute('data-index', index);
            sliderDots.appendChild(dot);
        });
    }
}

// Populate tech stack
function populateTechStack(techData) {
    if (!techData) return;
    
    document.querySelector('#tech-stack .section-title').textContent = techData.title;
    
    const techContainer = document.querySelector('.tech-stack');
    if (techContainer && techData.items) {
        techContainer.innerHTML = '';
        
        techData.items.forEach(item => {
            const techItem = document.createElement('div');
            techItem.className = 'tech-item hover-lift';
            
            const icon = document.createElement('i');
            icon.className = item.icon;
            
            const text = document.createTextNode(item.name);
            
            techItem.appendChild(icon);
            techItem.appendChild(text);
            techContainer.appendChild(techItem);
        });
    }
}

// Populate projects
function populateProjects(projectsData) {
    if (!projectsData) return;
    
    document.querySelector('#projects .section-title').textContent = projectsData.title;
    
    const projectsContainer = document.querySelector('.project-container');
    if (projectsContainer && projectsData.items) {
        // Clear existing projects
        projectsContainer.innerHTML = '';
        
        projectsData.items.forEach(project => {
            // Create project card
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card reveal';
            
            // Create project content
            const projectContent = document.createElement('div');
            projectContent.className = 'project-content';
            
            // Create project info
            const projectInfo = document.createElement('div');
            projectInfo.className = 'project-info';
            
            // Create project title
            const title = document.createElement('h3');
            title.className = 'project-title';
            title.textContent = project.title;
            projectInfo.appendChild(title);
            
            // Create project description
            const descriptionContainer = document.createElement('div');
            descriptionContainer.className = 'project-description';
            const description = document.createElement('p');
            description.textContent = project.description;
            descriptionContainer.appendChild(description);
            projectInfo.appendChild(descriptionContainer);
            
            // Create features list
            if (project.features && project.features.length > 0) {
                const featuresContainer = document.createElement('div');
                featuresContainer.className = 'project-features';
                
                const featuresTitle = document.createElement('h4');
                featuresTitle.textContent = 'Features:';
                featuresContainer.appendChild(featuresTitle);
                
                const featuresList = document.createElement('ul');
                project.features.forEach(feature => {
                    const featureItem = document.createElement('li');
                    featureItem.textContent = feature;
                    featuresList.appendChild(featureItem);
                });
                featuresContainer.appendChild(featuresList);
                projectInfo.appendChild(featuresContainer);
            }
            
            // Create use case
            if (project.use_case) {
                const useCaseContainer = document.createElement('div');
                useCaseContainer.className = 'project-use-case';
                
                const useCaseTitle = document.createElement('h4');
                useCaseTitle.textContent = 'Use Case:';
                useCaseContainer.appendChild(useCaseTitle);
                
                const useCase = document.createElement('p');
                useCase.textContent = project.use_case;
                useCaseContainer.appendChild(useCase);
                projectInfo.appendChild(useCaseContainer);
            }
            
            // Create project demo with GIF
            const projectDemo = document.createElement('div');
            projectDemo.className = 'project-demo';
            
            // Use img element for all images including GIFs
            const img = document.createElement('img');
            img.src = project.image;
            img.alt = project.title;
            img.className = 'hover-scale';
            img.loading = 'lazy';
            
            // Add error handling for project images
            img.onerror = function() {
                console.error(`Failed to load project image: ${project.image}`);
                // Set a fallback image or placeholder
                this.src = 'https://via.placeholder.com/800x400?text=Project+Image+Not+Found';
                this.alt = 'Project image not found';
            };
            
            projectDemo.appendChild(img);
            
            // Add project info and demo to content in the correct order
            projectContent.appendChild(projectInfo);
            projectContent.appendChild(projectDemo);
            
            // Add content to card
            projectCard.appendChild(projectContent);
            
            // Create project links
            const projectLinks = document.createElement('div');
            projectLinks.className = 'project-links';
            
            // Add tags
            if (project.tags && project.tags.length > 0) {
                project.tags.forEach(tag => {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'project-tag';
                    tagSpan.textContent = tag;
                    projectLinks.appendChild(tagSpan);
                });
            }
            
            // Add GitHub link
            if (project.github) {
                const githubLink = document.createElement('a');
                githubLink.href = project.github;
                githubLink.className = 'project-link';
                githubLink.target = '_blank';
                
                const githubIcon = document.createElement('i');
                githubIcon.className = 'fab fa-github';
                
                githubLink.appendChild(githubIcon);
                githubLink.appendChild(document.createTextNode(' View on GitHub'));
                projectLinks.appendChild(githubLink);
            }
            
            // Add links to card
            projectCard.appendChild(projectLinks);
            
            // Add card to container
            projectsContainer.appendChild(projectCard);
        });
    }
}

// Populate writing section
function populateWriting(writingData) {
    if (!writingData) return;
    
    document.querySelector('#writing .section-title').textContent = writingData.title;
    document.querySelector('#writing .section-description').textContent = writingData.description;
    
    const loremText = document.querySelector('.lorem-text');
    if (loremText && writingData.lorem_ipsum) {
        loremText.textContent = writingData.lorem_ipsum;
    }
    
    const substackEmbedsContainer = document.querySelector('.substack-embeds');
    if (substackEmbedsContainer && writingData.posts) {
        substackEmbedsContainer.innerHTML = '';
        
        writingData.posts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'substack-post-embed reveal';
            
            const title = document.createElement('p');
            title.setAttribute('lang', 'en');
            title.textContent = post.title + ' ' + post.author;
            
            const description = document.createElement('p');
            description.textContent = post.description;
            
            const link = document.createElement('a');
            link.href = post.url;
            link.className = 'btn btn-primary';
            link.target = '_blank';
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-newspaper';
            
            link.appendChild(icon);
            link.appendChild(document.createTextNode(' Read on Substack'));
            
            postCard.appendChild(title);
            postCard.appendChild(description);
            postCard.appendChild(link);
            
            substackEmbedsContainer.appendChild(postCard);
        });
    }
}

// Populate Instagram section
function populateInstagram(instagramData) {
    if (!instagramData) return;
    
    document.querySelector('#instagram .section-title').textContent = instagramData.title;
    
    const description = document.querySelector('#instagram .section-description');
    if (description) {
        description.innerHTML = `Some snapshots from my life and travels. Follow me on <a href="${instagramData.url}" target="_blank">Instagram</a> for more.`;
    }
    
    const instagramContainer = document.getElementById('instagram-container');
    if (instagramContainer) {
        // Clear existing content
        instagramContainer.innerHTML = '';
        
        // Create a grid for Instagram images
        const imageGrid = document.createElement('div');
        imageGrid.className = 'instagram-grid';
        imageGrid.style.display = 'grid';
        imageGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        imageGrid.style.gap = '1rem';
        imageGrid.style.marginBottom = '2rem';
        
        // Add Instagram images from the images/instagram directory
        const instagramImages = [
            'images/instagram/download.jpg',
            'images/instagram/download (1).jpg',
            'images/instagram/download (2).jpg'
        ];
        
        instagramImages.forEach(imagePath => {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'instagram-image-container';
            imageContainer.style.borderRadius = 'var(--radius-md)';
            imageContainer.style.overflow = 'hidden';
            imageContainer.style.boxShadow = 'var(--card-shadow)';
            imageContainer.style.transition = 'transform 0.3s ease';
            imageContainer.style.maxWidth = '100%';
            imageContainer.style.height = 'auto';
            
            // Add hover effect
            imageContainer.addEventListener('mouseenter', () => {
                imageContainer.style.transform = 'scale(1.05)';
            });
            
            imageContainer.addEventListener('mouseleave', () => {
                imageContainer.style.transform = 'scale(1)';
            });
            
            const img = document.createElement('img');
            img.src = imagePath;
            img.alt = 'Instagram photo';
            img.style.width = '100%';
            img.style.height = '250px';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            
            // Add error handling for Instagram images
            img.onerror = function() {
                console.error(`Failed to load Instagram image: ${imagePath}`);
                this.src = 'https://via.placeholder.com/250x250?text=Instagram+Image';
                this.alt = 'Instagram image not found';
            };
            
            imageContainer.appendChild(img);
            imageGrid.appendChild(imageContainer);
        });
        
        instagramContainer.appendChild(imageGrid);
        
        // Add the "View on Instagram" button
        const instagramLink = document.createElement('a');
        instagramLink.href = instagramData.url;
        instagramLink.className = 'btn btn-primary';
        instagramLink.target = '_blank';
        instagramLink.innerHTML = '<i class="fab fa-instagram"></i> View on Instagram';
        instagramContainer.appendChild(instagramLink);
    }
}

// Populate contact section
function populateContact(contactData) {
    if (!contactData) return;
    
    document.querySelector('#contact .section-title').textContent = contactData.title;
    
    const contactGrid = document.querySelector('.contact-grid');
    if (contactGrid && contactData.items) {
        contactGrid.innerHTML = '';
        
        // Ensure Resume and Email are in the first row, LinkedIn and WhatsApp in the second row
        const orderedItems = [
            contactData.items.find(item => item.title === "Resume"),
            contactData.items.find(item => item.title === "Email"),
            contactData.items.find(item => item.title === "LinkedIn"),
            contactData.items.find(item => item.title === "WhatsApp")
        ];
        
        orderedItems.forEach(item => {
            if (!item) return; // Skip if item not found
            
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item hover-lift reveal';
            
            const iconContainer = document.createElement('div');
            iconContainer.className = 'contact-icon';
            
            const icon = document.createElement('i');
            icon.className = item.icon;
            iconContainer.appendChild(icon);
            
            const infoContainer = document.createElement('div');
            infoContainer.className = 'contact-info';
            
            const title = document.createElement('h3');
            title.textContent = item.title;
            
            const link = document.createElement('a');
            link.href = item.url;
            link.textContent = item.text;
            if (item.url.startsWith('http')) {
                link.target = '_blank';
            }
            
            infoContainer.appendChild(title);
            infoContainer.appendChild(link);
            
            contactItem.appendChild(iconContainer);
            contactItem.appendChild(infoContainer);
            
            contactGrid.appendChild(contactItem);
        });
    }
}

// Populate footer
function populateFooter(socialData, siteData) {
    if (!socialData || !siteData) return;
    
    const socialLinks = document.querySelector('.social-links');
    if (socialLinks) {
        socialLinks.innerHTML = '';
        
        socialData.forEach(item => {
            const link = document.createElement('a');
            link.href = item.url;
            link.className = 'social-link';
            link.target = '_blank';
            link.setAttribute('aria-label', item.platform);
            
            const icon = document.createElement('i');
            icon.className = item.icon;
            
            link.appendChild(icon);
            socialLinks.appendChild(link);
        });
    }
    
    const copyright = document.querySelector('footer p');
    if (copyright && siteData.copyright) {
        copyright.textContent = siteData.copyright;
    }
}

// Initialize animations
function initAnimations() {
    // Initialize photo slider
    initPhotoSlider();
    
    // Initialize scroll reveal animations
    revealOnScroll();
    
    // Add oldschool cursor trail effect
    initCursorTrail();
    
    // Add retro text effect to headings
    initRetroTextEffect();
}

// Initialize photo slider
function initPhotoSlider() {
    const sliderTrack = document.querySelector('.slider-track');
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevArrow = document.querySelector('.prev-arrow');
    const nextArrow = document.querySelector('.next-arrow');
    
    if (!sliderTrack || slides.length === 0) return;
    
    let currentIndex = 0;
    const slideCount = slides.length;
    
    // Set initial position
    updateSlider();
    
    // Event listeners for controls
    if (prevArrow) {
        prevArrow.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + slideCount) % slideCount;
            updateSlider();
        });
    }
    
    if (nextArrow) {
        nextArrow.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % slideCount;
            updateSlider();
        });
    }
    
    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentIndex = index;
            updateSlider();
        });
    });
    
    // Auto-advance slides every 5 seconds
    let slideInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % slideCount;
        updateSlider();
    }, 5000);
    
    // Pause auto-advance on hover
    const sliderContainer = document.querySelector('.photo-slider-container');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });
        
        sliderContainer.addEventListener('mouseleave', () => {
            slideInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % slideCount;
                updateSlider();
            }, 5000);
        });
    }
    
    // Touch support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    sliderTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    sliderTrack.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swipe left - next slide
            currentIndex = (currentIndex + 1) % slideCount;
            updateSlider();
        } else if (touchEndX > touchStartX + swipeThreshold) {
            // Swipe right - previous slide
            currentIndex = (currentIndex - 1 + slideCount) % slideCount;
            updateSlider();
        }
    }
    
    // Update slider position and active dot
    function updateSlider() {
        sliderTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // Update active dot
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

// Initialize cursor trail effect (oldschool touch)
function initCursorTrail() {
    const body = document.body;
    const cursorTrailContainer = document.querySelector('.cursor-trail-container');
    if (!cursorTrailContainer) return;
    
    const trailCount = 5;
    const trails = [];
    
    // Create trail elements
    for (let i = 0; i < trailCount; i++) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.width = `${6 - i}px`;
        trail.style.height = `${6 - i}px`;
        trail.style.backgroundColor = i % 2 === 0 ? 'var(--primary)' : 'var(--secondary)';
        cursorTrailContainer.appendChild(trail);
        trails.push({
            element: trail,
            x: 0,
            y: 0
        });
    }
    
    // Update trail positions on mouse move
    document.addEventListener('mousemove', (e) => {
        // Update the position of the first trail to the current mouse position
        trails[0].x = e.clientX;
        trails[0].y = e.clientY;
        
        // Update the position of each trail to follow the previous one with a delay
        requestAnimationFrame(() => {
            for (let i = 0; i < trails.length; i++) {
                const trail = trails[i];
                
                // Position the trail
                trail.element.style.left = `${trail.x}px`;
                trail.element.style.top = `${trail.y}px`;
                
                // If not the first trail, follow the previous trail
                if (i < trails.length - 1) {
                    const nextTrail = trails[i + 1];
                    nextTrail.x = trail.x;
                    nextTrail.y = trail.y;
                }
            }
        });
    });
}

// Initialize retro text effect for headings (disabled for section titles)
function initRetroTextEffect() {
    // Don't apply retro text effect to section titles
    // This function is intentionally left empty to prevent shadow text below titles
}

// Optimized scroll reveal animation with throttling
let scrollTimeout;
function throttledReveal() {
    if (!scrollTimeout) {
        scrollTimeout = setTimeout(function() {
            revealOnScroll();
            scrollTimeout = null;
        }, 20); // 20ms throttle
    }
}

function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal:not(.active)');
    
    if (reveals.length === 0) return; // Skip if all elements are already revealed
    
    const windowHeight = window.innerHeight;
    const elementVisible = 150;
    
    reveals.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        if (elementTop < windowHeight - elementVisible) {
            el.classList.add('active');
        }
    });
}

// Use passive event listeners for better scroll performance
window.addEventListener('scroll', throttledReveal, { passive: true });
window.addEventListener('load', revealOnScroll);

// Function to preload and verify all images
function preloadAndVerifyImages() {
    console.log("Preloading and verifying images...");
    
    // Create a status element to show image loading status
    const statusElement = document.createElement('div');
    statusElement.style.position = 'fixed';
    statusElement.style.bottom = '10px';
    statusElement.style.right = '10px';
    statusElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
    statusElement.style.color = 'white';
    statusElement.style.padding = '10px';
    statusElement.style.borderRadius = '5px';
    statusElement.style.zIndex = '1000';
    statusElement.style.fontSize = '12px';
    statusElement.style.maxWidth = '300px';
    statusElement.style.maxHeight = '200px';
    statusElement.style.overflow = 'auto';
    statusElement.innerHTML = '<h4>Image Loading Status:</h4>';
    document.body.appendChild(statusElement);
    
    let totalImages = 0;
    let loadedImages = 0;
    let failedImages = 0;
    
    function updateStatus(message, success) {
        const item = document.createElement('div');
        item.style.marginBottom = '5px';
        item.style.color = success ? '#4ade80' : '#f87171';
        item.textContent = message;
        statusElement.appendChild(item);
        
        if (success) {
            loadedImages++;
        } else {
            failedImages++;
        }
        
        const summary = document.createElement('div');
        summary.style.borderTop = '1px solid rgba(255,255,255,0.2)';
        summary.style.marginTop = '10px';
        summary.style.paddingTop = '5px';
        summary.innerHTML = `Loaded: ${loadedImages}/${totalImages}, Failed: ${failedImages}`;
        
        // Replace the last element if it's a summary
        const lastElement = statusElement.lastElementChild;
        if (lastElement && lastElement.style.borderTop) {
            statusElement.removeChild(lastElement);
        }
        statusElement.appendChild(summary);
    }
    
    // Check about section images
    if (siteData.about && siteData.about.photos) {
        siteData.about.photos.forEach(photo => {
            totalImages++;
            const img = new Image();
            img.onload = () => updateStatus(`✓ ${photo.image}`, true);
            img.onerror = () => updateStatus(`✗ ${photo.image}`, false);
            img.src = photo.image;
        });
    }
    
    // Check project images
    if (siteData.projects && siteData.projects.items) {
        siteData.projects.items.forEach(project => {
            totalImages++;
            const img = new Image();
            img.onload = () => updateStatus(`✓ ${project.image}`, true);
            img.onerror = () => updateStatus(`✗ ${project.image}`, false);
            img.src = project.image;
        });
    }
    
    // Add a close button to the status element
    setTimeout(() => {
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '10px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.backgroundColor = '#3b82f6';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '3px';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => document.body.removeChild(statusElement);
        statusElement.appendChild(closeButton);
    }, 3000);
}

// Load content when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Preload and verify all images
    preloadAndVerifyImages();
    
    // Check for saved theme preference
    if (localStorage.getItem('darkMode') === 'true') {
        body.classList.add('dark-mode');
        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }
    
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        
        if (body.classList.contains('dark-mode')) {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('darkMode', 'true');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('darkMode', 'false');
        }
    });
    
    // Smooth scrolling for navigation links with offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Get the target's position
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                
                // Add a 120px offset to prevent the header from covering the content
                const offsetPosition = targetPosition - 120;
                
                // Scroll to the adjusted position
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Populate content from site data
    populateContent();
});