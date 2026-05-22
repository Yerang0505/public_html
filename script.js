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

    // --- '주요사업실적' 및 '인증등록현황' 인터랙티브 제어 엔진 ---
    const recordsTabs = document.querySelector('.records-tabs');
    
    if (recordsTabs) {
        const tabButtons = document.querySelectorAll('.records-tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        // 1. 탭 전환 기능
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');

                // 탭 버튼 활성화 상태 전환
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 탭 내용 활성화 상태 전환
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

        // 2. 실적 테이블 실시간 검색 및 카테고리 필터링 엔진
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

            // 결과 없음 메시지 제어
            if (visibleRowsCount === 0) {
                noResultsMsg.style.display = 'block';
            } else {
                noResultsMsg.style.display = 'none';
            }
        }

        // 실시간 타이핑 이벤트 바인딩
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase().trim();
                filterDeliveryTable();
            });
        }

        // 카테고리 필터 클릭 이벤트 바인딩
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                activeFilter = btn.getAttribute('data-filter');
                filterDeliveryTable();
            });
        });

        // 3. 고해상도 원본 스캔본 라이트박스 모달 엔진
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
            document.body.style.overflow = 'hidden'; // 뒷배경 스크롤 방지
        }

        function closeLightbox() {
            if (!lightboxModal) return;
            lightboxModal.classList.remove('active');
            document.body.style.overflow = ''; // 뒷배경 스크롤 복원
            setTimeout(() => {
                if (lightboxImg) lightboxImg.src = '';
            }, 300);
        }

        // '실적표 원본 스캔 보기' 버튼 바인딩
        const btnViewScan = document.querySelector('.btn-view-scan');
        if (btnViewScan) {
            btnViewScan.addEventListener('click', () => {
                const scanImg = btnViewScan.getAttribute('data-scan');
                openLightbox(`./${scanImg}`, '지명원 - 주요사업실적 원본 스캔본');
            });
        }

        // 각 인증 카드의 '원본 스캔 보기' 버튼 바인딩
        const certZoomBtns = document.querySelectorAll('.btn-zoom-scan, .cert-image-frame');
        certZoomBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // 최인접 .cert-card를 찾거나 직접 data-scan 읽기
                const card = btn.closest('.cert-card');
                const zoomBtn = card ? card.querySelector('.btn-zoom-scan') : null;
                const scanImg = zoomBtn ? zoomBtn.getAttribute('data-scan') : btn.getAttribute('data-scan');
                const certTitle = card ? card.querySelector('.cert-title').textContent : '인증서 원본 스캔본';

                if (scanImg) {
                    openLightbox(`./${scanImg}`, `${certTitle} - 공식 스캔본`);
                }
            });
        });

        // 라이트박스 닫기 바인딩
        if (lightboxClose) {
            lightboxClose.addEventListener('click', closeLightbox);
        }

        if (lightboxModal) {
            // 라이트박스 바깥 영역 클릭 시 닫기
            lightboxModal.addEventListener('click', (e) => {
                if (e.target === lightboxModal || e.target.classList.contains('lightbox-content-wrapper')) {
                    closeLightbox();
                }
            });
        }

        // ESC 키 입력 시 닫기
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
        const contactInput = document.getElementById('inquiry-contact');
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
            { input: contactInput, err: 'error-contact' },
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

            // Simulate server network request delay for premium UX feel
            setTimeout(() => {
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
                    contact: contactInput.value.trim(),
                    category: categoryInput.value,
                    title: titleInput.value.trim(),
                    content: contentInput.value.trim(),
                    submittedAt: now.toLocaleString('ko-KR')
                };

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

            }, 1200); // 1.2s delay for professional spinner feedback
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
                case '사용 문제': return 'use-problem';
                case '고장 및 수리': return 'repair';
                case '일반 문의': return 'general';
                case '기타': return 'etc';
                default: return 'default';
            }
        }
    }
});
