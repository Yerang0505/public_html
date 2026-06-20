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

        const pdfUrl = 'ì¹´ë“œ?´ìŠ¤.pdf';

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
                    sliderLoading.innerHTML = `<p style="color: #ef4444; font-weight: 600; padding: 20px; text-align: center;">ì¹´ë“œ?´ìŠ¤ ?˜ì´ì§€ë¥?ê·¸ë¦¬???„ì¤‘ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.</p>`;
                }
            });
        }).catch(err => {
            console.error("Error loading PDF document:", err);
            if (sliderLoading) {
                sliderLoading.innerHTML = `<p style="color: #ef4444; font-weight: 600; padding: 20px; text-align: center;">PDF ì¹´ë“œ?´ìŠ¤ ?Œì¼??ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤. ê²½ë¡œ ?ëŠ” ?íƒœë¥??•ì¸??ì£¼ì„¸??</p>`;
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

    // --- 'ì£¼ìš”?¬ì—…?¤ì ' ë°?'?¸ì¦?±ë¡?„í™©' ?¸í„°?™í‹°ë¸??œì–´ ?”ì§„ ---
    const recordsTabs = document.querySelector('.records-tabs');
    
    if (recordsTabs) {
        const tabButtons = document.querySelectorAll('.records-tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        // 1. ???„í™˜ ê¸°ëŠ¥
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');

                // ??ë²„íŠ¼ ?œì„±???íƒœ ?„í™˜
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // ???´ìš© ?œì„±???íƒœ ?„í™˜
                tabPanes.forEach(pane => {
                    if (pane.id === targetTab) {
                        pane.classList.add('active');
                    } else {
                        pane.classList.remove('active');
                    }
                });

                // Scroll Animation Reflow
                if (typeof observer !== 'undefined' && observer.observe) {
                    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
                }
            });
        });

        // 2. ?¤ì  ?Œì´ë¸??¤ì‹œê°?ê²€??ë°?ì¹´í…Œê³ ë¦¬ ?„í„°ë§??”ì§„
        const searchInput = document.getElementById('records-search');
        const filterBtns = document.querySelectorAll('.records-filter-btn');
        const tableRows = document.querySelectorAll('#delivery-table tbody tr');
        const noResultsMsg = document.getElementById('no-results-msg');

        let activeFilter = 'all';
        let searchQuery = '';

        function filterDeliveryTable() {
            let visibleRowsCount = 0;

            tableRows.forEach(row => {
                const clientName = row.querySelector('.client-name').textContent.toLowerCase();
                const projectTitle = row.querySelector('.project-title').textContent.toLowerCase();
                const rowCategory = row.getAttribute('data-category');

                const matchesSearch = clientName.includes(searchQuery) || projectTitle.includes(searchQuery);
                const matchesFilter = activeFilter === 'all' || rowCategory === activeFilter;

                if (matchesSearch && matchesFilter) {
                    row.style.display = '';
                    visibleRowsCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            // ê²°ê³¼ ?†ìŒ ë©”ì‹œì§€ ?œì–´
            if (visibleRowsCount === 0) {
                noResultsMsg.style.display = 'block';
            } else {
                noResultsMsg.style.display = 'none';
            }
        }

        // ?¤ì‹œê°??€?´í•‘ ?´ë²¤??ë°”ì¸??        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase().trim();
                filterDeliveryTable();
            });
        }

        // ì¹´í…Œê³ ë¦¬ ?„í„° ?´ë¦­ ?´ë²¤??ë°”ì¸??        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                activeFilter = btn.getAttribute('data-filter');
                filterDeliveryTable();
            });
        });

        // 3. ê³ í•´?ë„ ?ë³¸ ?¤ìº”ë³??¼ì´?¸ë°•??ëª¨ë‹¬ ?”ì§„
        const lightboxModal = document.getElementById('lightbox-modal');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const lightboxClose = document.getElementById('lightbox-close');

        function openLightbox(imageSrc, captionText) {
            if (!lightboxModal || !lightboxImg) return;
            lightboxImg.src = imageSrc;
            if (lightboxCaption && captionText) {
                lightboxCaption.textContent = captionText;
            }
            lightboxModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // ?·ë°°ê²??¤í¬ë¡?ë°©ì?
        }

        function closeLightbox() {
            if (!lightboxModal) return;
            lightboxModal.classList.remove('active');
            document.body.style.overflow = ''; // ?·ë°°ê²??¤í¬ë¡?ë³µì›
            setTimeout(() => {
                if (lightboxImg) lightboxImg.src = '';
            }, 300);
        }

        // '?¤ì ???ë³¸ ?¤ìº” ë³´ê¸°' ë²„íŠ¼ ë°”ì¸??        const btnViewScan = document.querySelector('.btn-view-scan');
        if (btnViewScan) {
            btnViewScan.addEventListener('click', () => {
                const scanImg = btnViewScan.getAttribute('data-scan');
                openLightbox(`./${scanImg}`, 'ì§€ëª…ì› - ì£¼ìš”?¬ì—…?¤ì  ?ë³¸ ?¤ìº”ë³?);
            });
        }

        // ê°??¸ì¦ ì¹´ë“œ??'?ë³¸ ?¤ìº” ë³´ê¸°' ë²„íŠ¼ ë°”ì¸??        const certZoomBtns = document.querySelectorAll('.btn-zoom-scan, .cert-image-frame');
        certZoomBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // ìµœì¸??.cert-cardë¥?ì°¾ê±°??ì§ì ‘ data-scan ?½ê¸°
                const card = btn.closest('.cert-card');
                const zoomBtn = card ? card.querySelector('.btn-zoom-scan') : null;
                const scanImg = zoomBtn ? zoomBtn.getAttribute('data-scan') : btn.getAttribute('data-scan');
                const certTitle = card ? card.querySelector('.cert-title').textContent : '?¸ì¦???ë³¸ ?¤ìº”ë³?;

                if (scanImg) {
                    openLightbox(`./${scanImg}`, `${certTitle} - ê³µì‹ ?¤ìº”ë³?);
                }
            });
        });

        // ?¼ì´?¸ë°•???«ê¸° ë°”ì¸??        if (lightboxClose) {
            lightboxClose.addEventListener('click', closeLightbox);
        }

        if (lightboxModal) {
            // ?¼ì´?¸ë°•??ë°”ê¹¥ ?ì—­ ?´ë¦­ ???«ê¸°
            lightboxModal.addEventListener('click', (e) => {
                if (e.target === lightboxModal || e.target.classList.contains('lightbox-content-wrapper')) {
                    closeLightbox();
                }
            });
        }

        // ESC ???…ë ¥ ???«ê¸°
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    // --- Inquiry & A/S Form Handling Engine ---
    const inquiryForm = document.getElementById('inquiry-form');
    const successView = document.getElementById('success-view');
    const inquiryCard = document.getElementById('inquiry-card');

    if (inquiryForm && successView) {
        // Elements of form inputs
        const nameInput = document.getElementById('inquiry-name');
        const emailInput = document.getElementById('inquiry-email');
        const categoryInput = document.getElementById('inquiry-category');
        const titleInput = document.getElementById('inquiry-title');
        const contentInput = document.getElementById('inquiry-content');
        const consentInput = document.getElementById('inquiry-consent');
        const btnSubmit = document.getElementById('btn-submit');
        const btnSpinner = document.getElementById('btn-spinner');

        // Elements of receipt/success view
        const receiptNo = document.getElementById('receipt-no');
        const receiptName = document.getElementById('receipt-name');
        const receiptCategory = document.getElementById('receipt-category');
        const receiptTitle = document.getElementById('receipt-title');
        const receiptDate = document.getElementById('receipt-date');
        const btnResetForm = document.getElementById('btn-reset-form');

        // Field Validation helpers
        function validateField(inputElement, errorElementId) {
            const errorElement = document.getElementById(errorElementId);
            let isValid = true;

            if (inputElement.type === 'checkbox') {
                isValid = inputElement.checked;
            } else if (inputElement.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(inputElement.value.trim());
            } else {
                isValid = inputElement.value.trim() !== '';
            }

            const formGroup = inputElement.closest('.form-group') || inputElement.closest('.form-group-checkbox');

            if (!isValid) {
                if (formGroup) formGroup.classList.add('has-error');
                if (errorElement) errorElement.style.display = 'block';
            } else {
                if (formGroup) formGroup.classList.remove('has-error');
                if (errorElement) errorElement.style.display = 'none';
            }

            return isValid;
        }

        // Real-time error clearance on input
        const inputPairs = [
            { input: nameInput, err: 'error-name' },
            { input: emailInput, err: 'error-email' },
            { input: categoryInput, err: 'error-category' },
            { input: titleInput, err: 'error-title' },
            { input: contentInput, err: 'error-content' },
            { input: consentInput, err: 'error-consent' }
        ];

        inputPairs.forEach(pair => {
            if (pair.input) {
                const eventType = pair.input.tagName === 'SELECT' || pair.input.type === 'checkbox' ? 'change' : 'input';
                pair.input.addEventListener(eventType, () => {
                    validateField(pair.input, pair.err);
                });
            }
        });

        // Form Submit Handler
        inquiryForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Validate all fields
            let isFormValid = true;
            inputPairs.forEach(pair => {
                if (pair.input) {
                    const isFieldValid = validateField(pair.input, pair.err);
                    if (!isFieldValid) {
                        isFormValid = false;
                    }
                }
            });

            if (!isFormValid) {
                // Focus on the first invalid field
                const firstInvalid = inputPairs.find(pair => {
                    if (pair.input.type === 'checkbox') return !pair.input.checked;
                    if (pair.input.type === 'email') {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        return !emailRegex.test(pair.input.value.trim());
                    }
                    return pair.input.value.trim() === '';
                });
                if (firstInvalid && firstInvalid.input) {
                    firstInvalid.input.focus();
                }
                return;
            }

            // Show submitting spinner & disable submit button to prevent double clicks
            if (btnSubmit) {
                btnSubmit.disabled = true;
                if (btnSpinner) btnSpinner.classList.add('active');
            }

            // Generate secure random ticket ID: BA-YYYYMMDD-XXXX (where XXXX is 4 random letters/numbers)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${year}${month}${day}`;
            
            const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let randomStr = '';
            for (let i = 0; i < 4; i++) {
                randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const ticketId = `BA-${dateStr}-${randomStr}`;

            // Gather submitted data
            const submissionData = {
                ticketId: ticketId,
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                category: categoryInput.value,
                title: titleInput.value.trim(),
                content: contentInput.value.trim(),
                submittedAt: now.toLocaleString('ko-KR')
            };

            // FormSubmit API Data (Zero-setup free email sending)
            const email = emailInput.value.trim();
            const formData = {
                _subject: `[ë¹„ì—?´í…] ë¬¸ì˜ ?‘ìˆ˜ ?„ë£Œ (${categoryInput.value})`,
                "?‘ìˆ˜ ë²ˆí˜¸": ticketId,
                "?‘ì„±??/ ?Œì‚¬ëª?: nameInput.value.trim(),
                "?´ë©”??: email,
                "ë¬¸ì˜ ? í˜•": categoryInput.value,
                "?œëª©": titleInput.value.trim(),
                "?´ìš©": contentInput.value.trim(),
                "?‘ìˆ˜ ?¼ì‹œ": now.toLocaleString('ko-KR'),
                _replyto: email, // ?´ë©”???µì¥ ??ë¬¸ì˜?ì—ê²?ë°”ë¡œ ?µì¥ ê°€?¥í•˜?„ë¡ ?¤ì •
                _cc: email // ë¬¸ì˜ ? ì²­???´ë©”?¼ë¡œ???¬ë³¸ ?„ì†¡
            };

            // 1. Send Inquiry details via FormSubmit API to gwf0123@hanmail.net (site owner)
            const emailPromise = fetch("https://formsubmit.co/ajax/gwf0123@hanmail.net", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            // 2. Send Inquiry details to Netlify Forms (if deployed on Netlify)
            const netlifyParams = new URLSearchParams();
            netlifyParams.append("form-name", "contact_company");
            netlifyParams.append("client_name", nameInput.value.trim());
            netlifyParams.append("client_email", email);
            netlifyParams.append("category", categoryInput.value);
            netlifyParams.append("title", titleInput.value.trim());
            netlifyParams.append("client_message", contentInput.value.trim());
            netlifyParams.append("consent", consentInput.checked ? "on" : "off");

            const netlifyPromise = fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: netlifyParams.toString()
            });

            // Wait for both submissions (FormSubmit & Netlify Forms) to finish
            Promise.allSettled([emailPromise, netlifyPromise])
            .then((results) => {
                const emailResult = results[0];
                if (emailResult.status === 'fulfilled' && emailResult.value.ok) {
                    console.log('?´ë©”???„ì†¡ ?±ê³µ');
                } else {
                    console.warn('?´ë©”???„ì†¡ ?¤íŒ¨ (?¤íŠ¸?Œí¬ ?íƒœ ?ëŠ” FormSubmit ?¤ì •???•ì¸?˜ì„¸??');
                }
                
                const netlifyResult = results[1];
                if (netlifyResult.status === 'fulfilled' && netlifyResult.value.ok) {
                    console.log('Netlify Forms ?„ì†¡ ?„ë£Œ');
                }
            })
            .catch(err => {
                console.error('?„ì†¡ ì¤??ëŸ¬ ë°œìƒ:', err);
            })
            .finally(() => {
                // Store silently in localStorage (100% private, not displayed anywhere on front-end)
                try {
                    const existingInquiries = JSON.parse(localStorage.getItem('batech_inquiries') || '[]');
                    existingInquiries.push(submissionData);
                    localStorage.setItem('batech_inquiries', JSON.stringify(existingInquiries));
                    console.log('Inquiry registered successfully (Private Log):', submissionData);
                } catch (err) {
                    console.error('Failed to log inquiry in localStorage:', err);
                }

                // Populate success receipt elements
                if (receiptNo) receiptNo.textContent = ticketId;
                if (receiptName) receiptName.textContent = submissionData.name;
                if (receiptCategory) {
                    receiptCategory.innerHTML = `<span class="receipt-badge category-${getCategoryClass(submissionData.category)}">${submissionData.category}</span>`;
                }
                if (receiptTitle) receiptTitle.textContent = submissionData.title;
                if (receiptDate) receiptDate.textContent = submissionData.submittedAt;

                // Animate transition: fade out form, fade in success view
                inquiryForm.style.opacity = '0';
                setTimeout(() => {
                    inquiryForm.style.display = 'none';
                    successView.style.display = 'block';
                    successView.offsetHeight; // force reflow
                    successView.style.opacity = '1';
                    successView.style.transform = 'translateY(0)';
                    
                    // Smoothly scroll to card top
                    if (inquiryCard) {
                        inquiryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 300);
            });
        });

        // Reset Form Handler
        if (btnResetForm) {
            btnResetForm.addEventListener('click', () => {
                // Clear inputs
                inquiryForm.reset();
                
                // Clear any lingering error classes and error text visibility
                inputPairs.forEach(pair => {
                    if (pair.input) {
                        const formGroup = pair.input.closest('.form-group') || pair.input.closest('.form-group-checkbox');
                        if (formGroup) formGroup.classList.remove('has-error');
                        const errorElement = document.getElementById(pair.err);
                        if (errorElement) errorElement.style.display = 'none';
                    }
                });

                // Reset submit button state
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    if (btnSpinner) btnSpinner.classList.remove('active');
                }

                // Animate transition: fade out success view, fade in form
                successView.style.opacity = '0';
                successView.style.transform = 'translateY(15px)';
                setTimeout(() => {
                    successView.style.display = 'none';
                    inquiryForm.style.display = 'block';
                    inquiryForm.offsetHeight; // force reflow
                    inquiryForm.style.opacity = '1';
                    
                    if (inquiryCard) {
                        inquiryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 300);
            });
        }

        // Helper to categorize inquiry types for CSS styling badges
        function getCategoryClass(category) {
            switch (category) {
                case '?¬ìš© ë¬¸ì œ': return 'use-problem';
                case 'ê³ ì¥ ë°??˜ë¦¬': return 'repair';
                case '?¼ë°˜ ë¬¸ì˜': return 'general';
                case 'ê¸°í?': return 'etc';
                default: return 'default';
            }
        }
    }

    // --- ?´ë? ?„ì§?ìš© PDF ?„ì¹´?´ë¸Œ ë°?ë·°ì–´ ?œì–´ ?”ì§„ (internal.html ?„ìš©) ---
    const internalLayout = document.querySelector('.internal-doc-layout');
    if (internalLayout) {
        // PDF documents metadata
        const documents = {
            'web-build': {
                fileName: '?¹ì‚¬?´íŠ¸ êµ¬ì¶• ?ë£Œ.pdf',
                title: '?¹ì‚¬?´íŠ¸ êµ¬ì¶• ?ë£Œ',
                size: '1.38 MB',
                tag: '??ê°œë°œ'
            },
            'prompt-guide': {
                fileName: 'Prompt?‘ì„±ê°€?´ë“œ ?ë£Œ.pdf',
                title: 'Prompt?‘ì„±ê°€?´ë“œ ?ë£Œ',
                size: '193 KB',
                tag: '?„ë¡¬?„íŠ¸'
            },
            'data-analysis': {
                fileName: 'GenAIë¥??œìš©???°ì´??ë¶„ì„ ?ë£Œ.pdf',
                title: 'GenAIë¥??œìš©???°ì´??ë¶„ì„ ?ë£Œ',
                size: '232 KB',
                tag: '?°ì´??ë¶„ì„'
            },
            'presentation-ai': {
                fileName: 'ë°œí‘œ?ë£Œ ?ì„± AI ?ë£Œ.pdf',
                title: 'ë°œí‘œ?ë£Œ ?ì„± AI ?ë£Œ',
                size: '2.77 MB',
                tag: 'ë°œí‘œ?ë£Œ AI'
            },
            'gems-cardnews': {
                fileName: 'GEMS ê°€?´ë“œ?€ ì¹´ë“œ?´ìŠ¤ ?œì‘ ?ë£Œ.pdf',
                title: 'GEMS ê°€?´ë“œ?€ ì¹´ë“œ?´ìŠ¤ ?œì‘ ?ë£Œ',
                size: '444 KB',
                tag: 'ì¹´ë“œ?´ìŠ¤'
            }
        };

        // Stateful viewer variables
        let pdfDoc = null;
        let pageNum = 1;
        let pageRendering = false;
        let pageNumPending = null;
        let scale = 1.2; // Default zoom scale (120%)
        let currentDocId = 'web-build';
        let renderTask = null;

        // DOM elements
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        const titleEl = document.getElementById('viewer-title');
        const zoomPercentEl = document.getElementById('viewer-zoom-percent');
        const currentPageEl = document.getElementById('viewer-current-page');
        const totalPagesEl = document.getElementById('viewer-total-pages');
        const loadingEl = document.getElementById('viewer-loading');
        const loadingMsgEl = document.getElementById('viewer-loading-message');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnPrevPage = document.getElementById('btn-prev-page');
        const btnNextPage = document.getElementById('btn-next-page');
        const btnDownload = document.getElementById('btn-viewer-download');
        const docCards = document.querySelectorAll('.doc-card');

        // Function to load a PDF document
        function loadDocument(docId) {
            currentDocId = docId;
            const docInfo = documents[docId];
            if (!docInfo) return;

            // Show loading spinner
            if (loadingEl) {
                loadingEl.style.display = 'flex';
                if (loadingMsgEl) {
                    loadingMsgEl.textContent = `"${docInfo.title}" ë¬¸ì„œë¥?ë¶ˆëŸ¬?¤ê³  ?ˆìŠµ?ˆë‹¤...`;
                }
            }

            // Update viewer headers and actions
            if (titleEl) titleEl.textContent = docInfo.fileName;
            if (btnDownload) {
                btnDownload.href = `./${encodeURIComponent(docInfo.fileName)}`;
                btnDownload.setAttribute('download', docInfo.fileName);
            }

            // Reset page counter
            pageNum = 1;
            if (currentPageEl) currentPageEl.textContent = pageNum;

            // Load the document via PDF.js
            pdfjsLib.getDocument(`./${docInfo.fileName}`).promise.then(pdf => {
                pdfDoc = pdf;
                if (totalPagesEl) totalPagesEl.textContent = pdf.numPages;

                // Render first page
                renderPage(pageNum);
            }).catch(err => {
                console.error("Error loading PDF document:", err);
                if (loadingEl) {
                    loadingEl.style.display = 'flex';
                    if (loadingMsgEl) {
                        loadingMsgEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> ?Œì¼??ë¶ˆëŸ¬?¤ëŠ”???¤íŒ¨?ˆìŠµ?ˆë‹¤.</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.5);">ê²½ë¡œ: ./${docInfo.fileName}</span>`;
                    }
                }
            });
        }

        // Function to render a specific page
        function renderPage(num) {
            if (!pdfDoc) return;
            pageRendering = true;

            // Enable/disable page buttons
            if (btnPrevPage) btnPrevPage.disabled = (num <= 1);
            if (btnNextPage) btnNextPage.disabled = (num >= pdfDoc.numPages);
            if (currentPageEl) currentPageEl.textContent = num;

            // Get the PDF page
            pdfDoc.getPage(num).then(page => {
                const viewport = page.getViewport({ scale: scale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };

                // Cancel current rendering task if it exists
                if (renderTask) {
                    renderTask.cancel();
                }

                // Render page
                renderTask = page.render(renderContext);
                
                renderTask.promise.then(() => {
                    pageRendering = false;
                    // Hide loading spinner
                    if (loadingEl) {
                        loadingEl.style.display = 'none';
                    }
                    if (pageNumPending !== null) {
                        renderPage(pageNumPending);
                        pageNumPending = null;
                    }
                }).catch(err => {
                    if (err.name === 'Heading' || err.name === 'RenderingCancelledException') {
                        // Ignore cancelled rendering
                    } else {
                        console.error("Render task error:", err);
                        pageRendering = false;
                    }
                });
            });
        }

        // Helper to queue page rendering
        function queueRenderPage(num) {
            if (pageRendering) {
                pageNumPending = num;
            } else {
                renderPage(num);
            }
        }

        // Bind document sidebar card clicks
        docCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Prevent reloading if already active
                if (card.classList.contains('active')) return;

                // Update active state in UI
                docCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                const docId = card.getAttribute('data-doc-id');
                loadDocument(docId);
            });

            // Also support clicking the "ë°”ë¡œë³´ê¸°" (View Now) button inside cards
            const viewBtn = card.querySelector('.btn-doc-action.view');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent duplicate card click event
                    card.click();
                });
            }
        });

        // Zoom Controls
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                if (scale >= 2.5) return; // limit max zoom to 250%
                scale += 0.2;
                if (zoomPercentEl) zoomPercentEl.textContent = `${Math.round(scale * 100)}%`;
                renderPage(pageNum);
            });
        }

        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                if (scale <= 0.6) return; // limit min zoom to 60%
                scale -= 0.2;
                if (zoomPercentEl) zoomPercentEl.textContent = `${Math.round(scale * 100)}%`;
                renderPage(pageNum);
            });
        }

        // Page Navigation Controls
        if (btnPrevPage) {
            btnPrevPage.addEventListener('click', () => {
                if (!pdfDoc || pageNum <= 1) return;
                pageNum--;
                queueRenderPage(pageNum);
            });
        }

        if (btnNextPage) {
            btnNextPage.addEventListener('click', () => {
                if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
                pageNum++;
                queueRenderPage(pageNum);
            });
        }

        // Auto-load first document on startup
        loadDocument(currentDocId);
    }
});


