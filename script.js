document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const revealElements = document.querySelectorAll('.reveal');

    // Navigation Background Change on Scroll (Only for pages with a Hero section)
    const isHomepage = document.querySelector('.hero') !== null;
    
    // Set initial state for sub-pages
    if (!isHomepage) {
        navbar.classList.add('scrolled');
    }

    window.addEventListener('scroll', () => {
        if (!isHomepage) return; // Keep scrolled class on subpages
        
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Intersection Observer for Reveal Animation
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));

    // Smooth Scroll for Navigation Links (if they refer to IDs)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- Background Music Autoplay & Toggle Handler (Home screen only) ---
    const audio = document.getElementById('bg-audio');
    const musicBtn = document.getElementById('music-toggle');

    if (audio && musicBtn) {
        let isPlaying = false;

        const playAudio = () => {
            audio.play().then(() => {
                isPlaying = true;
                musicBtn.classList.add('playing');
            }).catch(err => {
                console.log("Autoplay blocked, waiting for user interaction.", err);
            });
        };

        // Try playing on load
        playAudio();

        // Autoplay fallback: play on first user interaction anywhere
        const startOnInteraction = () => {
            if (!isPlaying) {
                playAudio();
                // Remove listeners once played
                document.removeEventListener('click', startOnInteraction);
                document.removeEventListener('keydown', startOnInteraction);
            }
        };

        document.addEventListener('click', startOnInteraction);
        document.addEventListener('keydown', startOnInteraction);

        // Click handler to toggle play/pause
        musicBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent trigger startOnInteraction immediately
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
                musicBtn.classList.remove('playing');
            } else {
                audio.play();
                isPlaying = true;
                musicBtn.classList.add('playing');
            }
        });
    }
    // --- Equipment Gallery Filtering Logic ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (filterButtons.length > 0 && galleryItems.length > 0) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                // Add active class to current button
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');

                galleryItems.forEach(item => {
                    if (filterValue === 'all' || item.classList.contains(filterValue)) {
                        item.style.display = 'block';
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'scale(1)';
                        }, 50);
                    } else {
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            item.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }

    // --- 2026 Campaign PDF Card News Slider ---
    const pdfSlider = document.getElementById('pdf-slider');
    const sliderPrevBtn = document.getElementById('slider-prev');
    const sliderNextBtn = document.getElementById('slider-next');
    const pageIndicator = document.getElementById('page-indicator');
    const sliderLoading = document.getElementById('slider-loading');

    if (pdfSlider) {
        let pdfDoc = null;
        let currentSlideIndex = 0;
        let slides = [];
        let isTransitioning = false;

        const pdfUrl = '카드뉴스.pdf';

        // Initialize PDF.js loading
        pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
            pdfDoc = pdf;
            const numPages = pdf.numPages;

            // Render all pages sequentially to preserve ordering and avoid canvas overlap
            let renderPromise = Promise.resolve();
            for (let i = 1; i <= numPages; i++) {
                const pageNum = i;
                renderPromise = renderPromise.then(() => renderPage(pageNum));
            }

            renderPromise.then(() => {
                // Hide the loader once everything is rendered
                if (sliderLoading) {
                    sliderLoading.style.display = 'none';
                }

                // Gather all slides and set up the active initial state
                slides = Array.from(pdfSlider.querySelectorAll('.card-slide'));
                if (slides.length > 0) {
                    slides[0].classList.add('active');
                    updatePageIndicator(1, numPages);
                }

                // Clicking anywhere inside the card-news-slider container advances the page
                pdfSlider.addEventListener('click', (e) => {
                    // Prevent advancing if the user clicked navigation buttons or progress badges
                    if (e.target.closest('.slider-nav') || e.target.closest('.slider-pagination')) {
                        return;
                    }
                    goToNextSlide();
                });
            }).catch(err => {
                console.error("Error rendering PDF pages:", err);
                if (sliderLoading) {
                    sliderLoading.innerHTML = `<p style="color: #ef4444; font-weight: 600; padding: 20px; text-align: center;">카드뉴스 페이지를 그리는 도중 오류가 발생했습니다.</p>`;
                }
            });
        }).catch(err => {
            console.error("Error loading PDF document:", err);
            if (sliderLoading) {
                sliderLoading.innerHTML = `<p style="color: #ef4444; font-weight: 600; padding: 20px; text-align: center;">PDF 카드뉴스 파일을 불러올 수 없습니다. 경로 또는 상태를 확인해 주세요.</p>`;
            }
        });

        // Function to render a single PDF page onto a dynamic Canvas element
        function renderPage(pageNum) {
            return pdfDoc.getPage(pageNum).then(page => {
                const slideDiv = document.createElement('div');
                slideDiv.className = 'card-slide';
                slideDiv.dataset.page = pageNum;

                const canvas = document.createElement('canvas');
                slideDiv.appendChild(canvas);
                pdfSlider.appendChild(slideDiv);

                const ctx = canvas.getContext('2d');
                
                // Render at a high density (scale: 2.0) for crisp, premium rendering on high-DPI screens
                const viewport = page.getViewport({ scale: 2.0 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };

                return page.render(renderContext).promise;
            });
        }

        // Helper to update the pagination badge
        function updatePageIndicator(current, total) {
            if (pageIndicator) {
                pageIndicator.textContent = `${current} / ${total}`;
            }
        }

        // Horizontal slider transition engine
        function goToSlide(nextIndex) {
            if (isTransitioning || slides.length === 0) return;
            isTransitioning = true;

            const total = slides.length;
            const currentIndex = currentSlideIndex;

            // Handle infinite circular loop
            nextIndex = (nextIndex + total) % total;

            const currentSlide = slides[currentIndex];
            const nextSlide = slides[nextIndex];

            // Determine if we're moving forward or backward in the cycle
            let isForward = nextIndex > currentIndex || (currentIndex === total - 1 && nextIndex === 0);
            if (currentIndex === 0 && nextIndex === total - 1) {
                isForward = false;
            }

            // Remove translation remnants
            slides.forEach(slide => {
                slide.classList.remove('prev-slide');
            });

            if (isForward) {
                // Forward Translation (Right to Left):
                // 1. Current slide slides out to the left
                currentSlide.classList.remove('active');
                currentSlide.classList.add('prev-slide');

                // 2. Next slide starts at right (100%) and slides into focus (0)
                nextSlide.style.transition = 'none';
                nextSlide.classList.remove('prev-slide');
                nextSlide.classList.remove('active');
                nextSlide.offsetHeight; // Force DOM layout reflow
                nextSlide.style.transition = '';
                nextSlide.classList.add('active');
            } else {
                // Backward Translation (Left to Right):
                // 1. Current slide slides out to the right (default transform 100%)
                currentSlide.classList.remove('active');

                // 2. Next slide starts at left (-100%) and slides into focus (0)
                nextSlide.style.transition = 'none';
                nextSlide.classList.add('prev-slide');
                nextSlide.classList.remove('active');
                nextSlide.offsetHeight; // Force DOM layout reflow
                nextSlide.style.transition = '';
                nextSlide.classList.remove('prev-slide');
                nextSlide.classList.add('active');
            }

            currentSlideIndex = nextIndex;
            updatePageIndicator(currentSlideIndex + 1, total);

            // Re-enable clicks after the CSS slide transition finishes
            setTimeout(() => {
                isTransitioning = false;
            }, 600); // 0.6s matches CSS transition duration
        }

        function goToNextSlide() {
            goToSlide(currentSlideIndex + 1);
        }

        function goToPrevSlide() {
            goToSlide(currentSlideIndex - 1);
        }

        // Nav arrow event bindings with stopPropagation to avoid parent container click double-triggers
        if (sliderPrevBtn) {
            sliderPrevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                goToPrevSlide();
            });
        }

        if (sliderNextBtn) {
            sliderNextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                goToNextSlide();
            });
        }
    }

    // --- Premium Document Viewer (주요사업실적) ---
    const recordsViewer = document.getElementById('records-viewer');
    const viewerLoading = document.getElementById('viewer-loading');

    if (recordsViewer && viewerLoading) {
        let pdfDoc = null;
        const pdfUrl = '지명원.pdf';
        const startPage = 10;
        const endPage = 21;

        // Initialize PDF.js loading for 지명원
        pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
            pdfDoc = pdf;
            
            // Loop sequentially from page 10 to 21 to avoid page order scrambling and render lag
            let renderPromise = Promise.resolve();
            for (let i = startPage; i <= endPage; i++) {
                const pageNum = i;
                renderPromise = renderPromise.then(() => renderRecordPage(pageNum));
            }

            renderPromise.then(() => {
                // Hide the loader once everything is rendered
                viewerLoading.style.display = 'none';
                
                // Add class to trigger fade-in transition
                const wrappers = recordsViewer.querySelectorAll('.pdf-page-wrapper');
                wrappers.forEach(wrapper => {
                    wrapper.classList.add('rendered');
                });
            }).catch(err => {
                console.error("Error rendering record pages:", err);
                viewerLoading.innerHTML = `<p style="color: #ef4444; font-weight: 600; padding: 20px; text-align: center;">실적 페이지를 그리는 도중 오류가 발생했습니다.</p>`;
            });
        }).catch(err => {
            console.error("Error loading record PDF:", err);
            viewerLoading.innerHTML = `<p style="color: #ef4444; font-weight: 600; padding: 20px; text-align: center;">지명원 파일을 불러올 수 없습니다. 경로 또는 상태를 확인해 주세요.</p>`;
        });

        // Function to render a single PDF page into a dynamic wrapper and canvas
        function renderRecordPage(pageNum) {
            return pdfDoc.getPage(pageNum).then(page => {
                const pageWrapperDiv = document.createElement('div');
                pageWrapperDiv.className = 'pdf-page-wrapper';
                
                const canvas = document.createElement('canvas');
                pageWrapperDiv.appendChild(canvas);
                
                const label = document.createElement('div');
                label.className = 'page-number-label';
                label.textContent = `페이지 ${pageNum}`;
                pageWrapperDiv.appendChild(label);
                
                recordsViewer.appendChild(pageWrapperDiv);

                const ctx = canvas.getContext('2d');
                
                // Scale 2.0 for premium high-resolution render (crisp text)
                const viewport = page.getViewport({ scale: 2.0 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };

                return page.render(renderContext).promise;
            });
        }
    }
});
