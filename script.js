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

    // --- AI 기술설명서 작성 게시판 제어 엔진 (internal.html 전용) ---
    const aiForm = document.getElementById('ai-form');
    const boardFeed = document.getElementById('board-feed');
    const btnAiGenerate = document.getElementById('btn-ai-generate');
    const btnResetAiDb = document.getElementById('btn-reset-ai-db');
    const boardSearch = document.getElementById('board-search');
    const boardEmptyState = document.getElementById('board-empty-state');

    if (aiForm && boardFeed) {
        const aiProduct = document.getElementById('ai-product');
        const aiTitle = document.getElementById('ai-title');
        const aiKeywords = document.getElementById('ai-keywords');
        const aiContent = document.getElementById('ai-content');
        const btnAiSubmit = document.getElementById('btn-ai-submit');
        const terminalBody = document.getElementById('terminal-body');
        const terminalStatus = document.getElementById('terminal-status');
        const terminalProgress = document.getElementById('terminal-progress');

        // 1. 초기 더미 씨드 데이터 (기본 탑재 AI 설명서 목록)
        const seedAIExplanations = [
            {
                id: 'AI-2026-0001',
                product: 'PKD 시리즈',
                title: 'PKD 고정밀 정량펌프의 등속도캠 미세 오차 및 저속 맥동 제어 가이드',
                keywords: '맥동 현상, 정밀 이송, 등속도 캠, 에어 댐퍼',
                summary: '저속 운전 상황에서 다이아프램 복귀 속도 조율 오차로 발생하는 미세 맥동을 등속도 캠 교정 및 에어 댐퍼 70% 예비 가압을 통해 교정하는 AI 정밀 해결책입니다.',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>저속(10Hz 이하) 운전 시 등속도 캠 안착 속도와 모터 역회전 제어 신호 간의 미세한 동기화 지연 발생.</li>\n<li>접액부 체크 밸브(Check Valve) 볼이 안착면에 0.05초 늦게 결합하면서 순간적인 압력 역류로 인한 맥동 발생.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>캠 안착 조정:</b> 기계식 등속도 캠 커버를 분리한 후 결합 볼트를 1/4회전 풀어 모터 원점 센서와 0도 위치를 정확히 리라인(Re-align)해 줍니다.</li>\n<li><b>에어 댐퍼 예비 가압:</b> 댐퍼 피스톤 공기압을 시스템 실제 작동 압력의 65% ~ 70% 수준으로 맞추어 충격을 완충합니다.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>체크 밸브 시트의 슬러지 누적을 정기 소독(매 3개월)하고 스프링 장력을 주기적으로 정밀 테스트하십시오.</li>\n</ul>',
                writer: 'BATECH AI Assistant',
                createdAt: '2026. 05. 21. 오전 10:20'
            },
            {
                id: 'AI-2026-0002',
                product: '수중볼텍스펌프',
                title: '오수 처리용 수중볼텍스펌프 고형물 고착 및 모터 과부하 차단 해소법',
                keywords: '임펠러 고착, 모터 과부하, 진동 소음, 이송 폐쇄',
                summary: '고농도 폐수 처리 시 발생하는 볼텍스 임펠러 후면 고형물 응집 현상에 대한 AI 가이드입니다. 24시간 주기 역회전 자동 플러싱 사이클 도입을 제안합니다.',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>섬유질 및 고농도 슬러지가 볼텍스 임펠러 후면 챔버 공간에 축적되어 마찰 부하를 극대화함.</li>\n<li>과전류 계전기(OCR)가 정격 전류의 115%를 초과 감지하여 모터 소손 방지를 위해 시스템을 차단함.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>역회전 제어 도입:</b> PLC 제어 패널에서 매 24시간 운전 시 3분간 모터를 강제 역회전(Reverse Mode) 시키는 역세척 알고리즘을 도입하십시오.</li>\n<li><b>간극 재배치:</b> 임펠러와 백플레이트 사이의 마모 간극을 기본 2.5mm로 재세팅하여 유체 역학적 고착 공간을 확보합니다.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>흡입구 펌프 전단에 스크린 메쉬를 추가 설치하고, 볼베어링 윤활 오일을 6개월 간격으로 점검하십시오.</li>\n</ul>',
                writer: 'BATECH AI Assistant',
                createdAt: '2026. 05. 22. 오전 09:15'
            },
            {
                id: 'AI-2026-0003',
                product: '부스터펌프',
                title: '다단 가압 부스터펌프 인버터 급가속 수격(Water Hammer) 완화 방법',
                keywords: '수격 현상, 압력 급변, 인버터 오차, PID 동기화',
                summary: '관망 사용량 급변 시 인버터 램프업 타임 지연으로 인해 발생하는 배관 충격(수격)을 인버터 PID 상수 및 압력 주기 변환을 통해 극복하는 지침입니다.',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>다점 동시 배수 시 유량 제어 램프 타임(Inverter Acceleration Ramp)이 6초로 지나치게 길게 설정되어 발생함.</li>\n<li>유량이 급격히 빠져나간 뒤 인버터가 과속 운전되면서 체크 밸브의 갑작스러운 차단 충격으로 배관에 충격파 발생.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>가감속 시간 튜닝:</b> 인버터 주파수 가속 램프 시간을 기존 6초에서 2.5초로, 감속 타임을 3초로 감축 설정하십시오.</li>\n<li><b>PID 비례이득 보정:</b> P-gain(비례이득) 값을 10% 하향하고, I-time(적분이득)을 0.8초 단축하여 응답 주기를 고속화합니다.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>배관 최고조단에 에어 릴리프 밸브가 완벽히 소기 동작하는지 정비 점검표에 추가하여 상시 점검하십시오.</li>\n</ul>',
                writer: 'BATECH AI Assistant',
                createdAt: '2026. 05. 22. 오후 13:40'
            }
        ];

        // 2. AI 전문 엔지니어링 기술 설명서 사전 데이터베이스 (주제별 매칭 텍스트)
        const aiEngineeringDatabase = {
            'PKD 시리즈': {
                symptoms: ['맥동', '소음', '오차', '정밀', '밸브'],
                title: 'PKD 시리즈 고정밀 토출 맥동 복원 및 씰(Seal) 교체 표준 기술가이드',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>PKD 정밀 펌프의 왕복동 다이아프램 복열 패킹 부위 윤활 부족 및 테플론(PTFE) 재질 씰 마모.</li>\n<li>토출 정압이 과도하여 체크볼 안착 시 순간적으로 유량이 리턴되면서 약 5~8% 내외의 정밀 토출 오차가 검출됨.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>복열 패킹 씰 교체:</b> 실린더 하우징을 개방한 후 손상된 로드 씰을 전용 플라스틱 핀으로 추출하고, 신형 STS 스프링 지지 씰로 교체 결합합니다.</li>\n<li><b>유량 보정 작업:</b> 토출측 조절 마이크로미터를 활용하여 행정 길이(Stroke Length)를 현재 65%에서 70%로 정밀 상향 교정하십시오.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>기어박스 내 특수 무맥동 전용 합성 오일 레벨을 주 1회 점검하고, 운전 중 누액 감지 홀에 그리스 누출 흔적이 없는지 밀착 모니터링하십시오.</li>\n</ul>'
            },
            '수중볼텍스펌프': {
                symptoms: ['막힘', '소음', '고착', '과부하', '슬러지'],
                title: '수중볼텍스펌프 임펠러 캐비테이션 마모 및 슬러지 퇴적 정밀 조치법',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>흡입구 측에 이물질이 정체되면서 임펠러 선단부에 국부적인 저압 영역이 생성되고 기포 파열로 인한 캐비테이션 침식 마모 발생.</li>\n<li>슬러지 비중 급증으로 펌프 시작 전류가 급등하여 모터 배선용 차단기(MCCB) 정격 차단 용량 초과.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>임펠러 침식 보수:</b> 마모된 볼텍스 임펠러 블레이드 면을 고분자 에폭시 수지 도포 코팅으로 재생하거나 교환 조치하십시오.</li>\n<li><b>흡입 수위 튜닝:</b> 가동 전 흡입측 가동 수위 센서 레벨을 기존 대비 30cm 상향하여 부압 유입을 근원적으로 차단합니다.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>주 1회 수조 하부 퇴적 슬러지를 에어 제트 분사기로 준설하여 펌프 내부로 고농도 찌꺼기가 한 번에 집중 유입되는 현상을 방지하십시오.</li>\n</ul>'
            },
            '부스터펌프': {
                symptoms: ['압력', '주파수', '센서', '수격', '인버터'],
                title: '가압 부스터 시스템 인버터 변속 동기화 불량 및 밸브 충격 파쇄 가이드',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>수압 피드백 루프에서 압력 전송기 센서(4-20mA) 케이블 주변 고전압 전력선 노이즈 간섭으로 인한 신호 떨림 현상.</li>\n<li>인버터 출력 주파수의 불안정한 스윙 제어로 모터 속도가 급변하며 급수가압 관로 내 충격(수격)이 누적 발생.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>센서 배선 개선:</b> 압력 센서 전송 신호선을 노이즈 차폐용 실드 트위스트 케이블로 교체 배선하고 접지를 단독 인가하십시오.</li>\n<li><b>PID 상향 고도화:</b> PID 제어의 미분 시간(D-time)을 0.02초 추가 활성화하여 미세 압력 변화에 대한 오버슈트를 최소화합니다.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>부스터 펌프 전단의 가압 공기실 탄성 멤브레인 백 공기압을 월 1회 측정하여 질소 보압(2.2bar) 상태를 유지하십시오.</li>\n</ul>'
            },
            '심정펌프': {
                symptoms: ['지하수', '모래', '마모', '역류', '체크'],
                title: '심정용 수중 펌프 모래 유입 블레이드 손상 및 체크밸브 고장 대응안',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>지하수 심정 내 케이싱 손상으로 모래 및 실트 성분의 광물 입자가 펌프 스테이지 내부에 지속적으로 과다 유입됨.</li>\n<li>임펠러 가이드 베인 및 토출 케이싱 체크 밸브의 밀착 고무 시트가 사립 입자에 의해 파손되면서 정지 시 역류 파괴 발생.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>체크 밸브 재구축:</b> 토출관 선단부 체크 밸브 유닛을 모래 입자에 내구성이 극대화된 우레탄 재질 체크볼 및 안착 시트로 교체하십시오.</li>\n<li><b>흡입 스크레이퍼 개량:</b> 펌프 외부 흡입 스크린 메쉬 간격을 0.5mm 초미세 스테인리스 필터형 쉴드로 보강 결합합니다.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>출수되는 용수 중 실트 모래 비율을 매월 검사하여 용수 함량이 0.01%를 초과할 경우 심정 세척 공정을 실행하십시오.</li>\n</ul>'
            },
            '송수/진공펌프': {
                symptoms: ['진공', '수밀', '임펠러', '흡입', '농업'],
                title: '송수 및 전진공 펌프 수밀 그랜드 패킹 누수 및 기밀 파괴 보수 기술서',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>그랜드 패킹 상자 내부의 패킹재 장기간 고온 마찰로 인한 경화 및 탄성 상실로 샤프트 틈새 대량 누수 발생.</li>\n<li>축 보호 슬리브 표면의 스크래치로 인해 공기가 진공 흡입 챔버 내로 동시 빨려 들어가 정격 진공도 형성 실패.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>그랜드 패킹 재패킹:</b> 기존 탄화 패킹을 완전히 제거하고 카본-테플론 혼합 사각 패킹을 3링 교차 엇갈려 재삽입한 뒤, 플랜지 너트를 적정 악력으로 평형 결속합니다.</li>\n<li><b>슬리브 연마 교환:</b> 표면이 마모된 보호 슬리브를 해체한 후 경질 크롬 도금 슬리브로 정밀 탈바꿈 교정하십시오.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>패킹 상자의 미세 수밀 냉각수 방출 속도가 분당 20-30방울 정도로 안정적으로 물이 똑똑 흐르도록 미세 플러싱 밸브를 유지 조율하십시오.</li>\n</ul>'
            },
            '기타': {
                symptoms: ['밸브', '배관', '모터', '전원', '그리스'],
                title: '펌프 연계 부속 배관 과압 배출 안전 밸브 시팅 오류 교정 지침',
                description: '<h4>[1] 이상 증상 원인 분석 (Root Cause Analysis)</h4>\n<ul>\n<li>토출 배관 라인의 안전 릴리프 밸브(Safety Relief Valve) 설정 스프링의 장력 노화로 인하여 상시 토출 배압 상황에서 미세한 바이패스 누출 발생.</li>\n<li>배관 지지 클램프의 결속 약화로 고압 유체 작동 시 기계 진동이 안전 밸브 릴리즈 기구부로 전도되어 차단 고장.</li>\n</ul>\n<h4>[2] AI 권장 해결 방안 (Actions Required)</h4>\n<ul>\n<li><b>안전 압력 세팅:</b> 릴리프 밸브 상단 조절 캡을 풀어 펌프 최고 토출압의 1.15배 수준으로 스프링 가압 하중을 엄밀히 조정 체결하십시오.</li>\n<li><b>방진 서포트 결속:</b> 진동이 과다한 배관 경로에 특수 고무 방진 패드가 안착된 클램핑 서포터를 추가 설치합니다.</li>\n</ul>\n<h4>[3] 장기 예방 및 정비 대책 (Preventative Maintenance)</h4>\n<ul>\n<li>안전 밸브의 수동 개방 고리를 매월 1회 수동 인장하여 스프링 및 격막 안착 유닛이 녹이나 결석에 의해 고착되지 않음을 항시 보증하십시오.</li>\n</ul>'
            }
        };

        // 3. AI 설명서 리스트 렌더링 엔진
        function renderBoardItems(items) {
            boardFeed.innerHTML = '';
            
            if (items.length === 0) {
                boardFeed.style.display = 'none';
                boardEmptyState.style.display = 'block';
                return;
            }

            boardFeed.style.display = 'grid';
            boardEmptyState.style.display = 'none';

            items.forEach((item, idx) => {
                const card = document.createElement('div');
                card.className = `board-card cat-${getCategoryClass(item.product)}`;
                card.dataset.id = item.id;
                
                // Set Up Keyword Badges HTML
                const keywordsArray = item.keywords.split(',').map(kw => kw.trim());
                const keywordsHtml = keywordsArray.map(kw => `<span class="keyword-badge">${kw}</span>`).join('');

                card.innerHTML = `
                    <div class="board-card-header">
                        <h4>${item.title}</h4>
                        <span class="board-tag tag-${getCategoryClass(item.product)}">${item.product}</span>
                    </div>
                    <div class="board-card-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${item.createdAt}</span>
                        <span><i class="fas fa-user-shield"></i> ${item.writer}</span>
                        <span><i class="fas fa-fingerprint"></i> ${item.id}</span>
                    </div>
                    <div class="board-card-body">
                        <p>${item.summary}</p>
                        <div class="board-card-keywords">
                            ${keywordsHtml}
                        </div>
                    </div>
                    
                    <!-- Collapsible AI Detailed Analysis Body -->
                    <div class="board-card-expanded" id="expanded-${item.id}">
                        ${item.description}
                    </div>

                    <div class="board-card-footer">
                        <button class="btn-card-toggle" data-target="${item.id}">
                            <span class="btn-text"><i class="fas fa-chevron-down"></i> 자세히 보기</span>
                        </button>
                        <button class="btn-card-delete" data-id="${item.id}" title="설명서 삭제">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                boardFeed.appendChild(card);
            });

            // 탭 확장 토글 바인딩
            const toggleBtns = boardFeed.querySelectorAll('.btn-card-toggle');
            toggleBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = btn.getAttribute('data-target');
                    const expandedArea = document.getElementById(`expanded-${targetId}`);
                    const btnText = btn.querySelector('.btn-text');
                    
                    if (expandedArea.style.display === 'block') {
                        expandedArea.style.display = 'none';
                        btnText.innerHTML = '<i class="fas fa-chevron-down"></i> 자세히 보기';
                    } else {
                        expandedArea.style.display = 'block';
                        btnText.innerHTML = '<i class="fas fa-chevron-up"></i> 접기';
                    }
                });
            });

            // 삭제 버튼 바인딩
            const deleteBtns = boardFeed.querySelectorAll('.btn-card-delete');
            deleteBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = btn.getAttribute('data-id');
                    if (confirm('선택하신 AI 기술 설명서를 삭제하시겠습니까?')) {
                        deleteAIExplanation(targetId);
                    }
                });
            });
        }

        // 카테고리 영문 클래스 맵핑
        function getCategoryClass(product) {
            switch (product) {
                case 'PKD 시리즈': return 'pkd';
                case '수중볼텍스펌프': return 'vortex';
                case '부스터펌프': return 'booster';
                case '심정펌프': return 'deep';
                case '송수/진공펌프': return 'pump';
                default: return 'etc';
            }
        }

        // 4. LocalStorage 데이터 로드 및 초기 씨딩
        function getAIExplanations() {
            const stored = localStorage.getItem('batech_ai_explanations');
            if (!stored) {
                // 씨드 데이터 저장 및 반환
                localStorage.setItem('batech_ai_explanations', JSON.stringify(seedAIExplanations));
                return seedAIExplanations;
            }
            return JSON.parse(stored);
        }

        // 5. 신규 아이템 저장
        function saveAIExplanation(newItem) {
            const list = getAIExplanations();
            list.unshift(newItem); // 최신 글이 처음에 오도록 삽입
            localStorage.setItem('batech_ai_explanations', JSON.stringify(list));
            renderBoardItems(list);
        }

        // 6. 개별 아이템 삭제
        function deleteAIExplanation(id) {
            let list = getAIExplanations();
            list = list.filter(item => item.id !== id);
            localStorage.setItem('batech_ai_explanations', JSON.stringify(list));
            renderBoardItems(list);
        }

        // 7. 전체 DB 초기화 및 리셋
        if (btnResetAiDb) {
            btnResetAiDb.addEventListener('click', () => {
                if (confirm('모든 데이터를 삭제하고 공장 출하 시의 기본 씨드 AI 설명서로 초기화하시겠습니까?')) {
                    localStorage.removeItem('batech_ai_explanations');
                    const initialList = getAIExplanations();
                    renderBoardItems(initialList);
                    
                    // 터미널 클리어 피드백
                    terminalBody.innerHTML = `
                        <div class="terminal-line"><span class="prompt">$</span> BATECH-AI-ENGINE 정밀 엔지니어링 데이터 초기화 완료.</div>
                        <div class="terminal-line"><span class="prompt">$</span> 로컬 스토리지 데이터베이스 복구를 수립했습니다. 기본 AI 설명서 3건 로드 완료.</div>
                    `;
                    terminalStatus.textContent = 'READY';
                    terminalStatus.className = 'terminal-status';
                    terminalProgress.style.width = '0%';
                }
            });
        }

        // 8. 실시간 검색 필터링 엔진
        if (boardSearch) {
            boardSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const allItems = getAIExplanations();
                
                const filtered = allItems.filter(item => {
                    const matchTitle = item.title.toLowerCase().includes(query);
                    const matchProduct = item.product.toLowerCase().includes(query);
                    const matchKeywords = item.keywords.toLowerCase().includes(query);
                    const matchSummary = item.summary.toLowerCase().includes(query);
                    return matchTitle || matchProduct || matchKeywords || matchSummary;
                });
                renderBoardItems(filtered);
            });
        }

        // 9. AI 실시간 설명서 스트리밍 자동 생성기 (Streaming Simulation)
        let isGenerating = false;

        if (btnAiGenerate) {
            btnAiGenerate.addEventListener('click', () => {
                if (isGenerating) return;

                // 유효성 체크
                const product = aiProduct.value;
                const title = aiTitle.value.trim();
                const keywords = aiKeywords.value.trim();

                if (!product) {
                    alert('대상 제품군을 먼저 선택해 주십시오.');
                    aiProduct.focus();
                    return;
                }
                if (!title) {
                    alert('설명서 제목을 작성해 주십시오.');
                    aiTitle.focus();
                    return;
                }
                if (!keywords) {
                    alert('기술 키워드나 고장증상을 작성해 주십시오.');
                    aiKeywords.focus();
                    return;
                }

                // AI 가동 시작 설정
                isGenerating = true;
                btnAiGenerate.disabled = true;
                btnAiSubmit.disabled = true;
                terminalStatus.textContent = 'GENERATING';
                terminalStatus.className = 'terminal-status generating';
                terminalProgress.style.width = '0%';

                // 터미널 가동 로그 띄우기
                terminalBody.innerHTML = `
                    <div class="terminal-line"><span class="prompt">$</span> BATECH-AI-ENGINE 로드 중... 200 OK</div>
                    <div class="terminal-line"><span class="prompt">$</span> 대상 제품군 분석: "${product}"</div>
                    <div class="terminal-line"><span class="prompt">$</span> 감지 키워드 필터링: [${keywords}]</div>
                    <div class="terminal-line"><span class="prompt">$</span> 전용 인공 신경망 가속 가동 시작... 지연시간 최소화 수립.</div>
                    <div class="terminal-line"><span class="prompt">$</span> AI 엔지니어 보고서 작성 개시... <span class="cursor"></span></div>
                `;

                // 매칭 텍스트 찾기 또는 동적 빌드
                const matchDb = aiEngineeringDatabase[product] || aiEngineeringDatabase['기타'];
                const targetDescription = matchDb.description;
                const targetTitle = matchDb.title;

                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += 10;
                    terminalProgress.style.width = `${progress}%`;
                    if (progress >= 100) {
                        clearInterval(progressInterval);
                    }
                }, 300);

                // 시뮬레이션 스트리밍 타이핑 시작 (1.5초 후 터미널에 로드)
                setTimeout(() => {
                    terminalBody.innerHTML = `
                        <div class="terminal-line"><span class="prompt">$</span> BATECH-AI-ENGINE 자동 기술문서 전송 개시:</div>
                        <div class="terminal-line"><span class="prompt">$</span> <b>[문서 제목] ${title}</b></div>
                        <div class="terminal-line" id="streaming-output"><span class="cursor"></span></div>
                    `;

                    const streamContainer = document.getElementById('streaming-output');
                    let charIndex = 0;
                    
                    // 타이핑 스트리밍 주기 함수
                    function typeCharacter() {
                        if (charIndex < targetDescription.length) {
                            // HTML 태그는 한 번에 스킵하여 렌더링 깨짐 방지
                            if (targetDescription.charAt(charIndex) === '<') {
                                const closingBracket = targetDescription.indexOf('>', charIndex);
                                if (closingBracket !== -1) {
                                    streamContainer.innerHTML = targetDescription.substring(0, closingBracket + 1) + '<span class="cursor"></span>';
                                    charIndex = closingBracket + 1;
                                } else {
                                    streamContainer.innerHTML = targetDescription.substring(0, charIndex + 1) + '<span class="cursor"></span>';
                                    charIndex++;
                                }
                            } else {
                                streamContainer.innerHTML = targetDescription.substring(0, charIndex + 1) + '<span class="cursor"></span>';
                                charIndex++;
                            }
                            
                            // 스크롤 아래로 고정
                            terminalBody.scrollTop = terminalBody.scrollHeight;
                            
                            // 무작위 속도감(25ms~45ms)으로 사실적인 스트리밍 모사
                            setTimeout(typeCharacter, Math.random() * 20 + 15);
                        } else {
                            // 타이핑 완료 처리
                            streamContainer.innerHTML = targetDescription; // 커서 제거 및 완전 삽입
                            
                            // 터미널 마지막 로그 추가
                            const finalLog = document.createElement('div');
                            finalLog.className = 'terminal-line';
                            finalLog.innerHTML = `<span class="prompt">$</span> AI 문서 생성 완료. 폼 본문에 자동 전사되었습니다. 등록을 완료해 주십시오.`;
                            terminalBody.appendChild(finalLog);
                            terminalBody.scrollTop = terminalBody.scrollHeight;

                            // 텍스트 영역에 복사
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(targetDescription, 'text/html');
                            const plainText = doc.body.textContent || doc.body.innerText;
                            aiContent.value = plainText.trim();
                            
                            // UI 활성화 상태 복귀
                            isGenerating = false;
                            btnAiGenerate.disabled = false;
                            btnAiSubmit.disabled = false;
                            terminalStatus.textContent = 'COMPLETE';
                            terminalStatus.className = 'terminal-status';
                            terminalProgress.style.width = '100%';
                        }
                    }

                    typeCharacter();

                }, 1500);
            });
        }

        // 10. 기술 설명서 전송 등록 폼 핸들러
        aiForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (isGenerating) return;

            const product = aiProduct.value;
            const title = aiTitle.value.trim();
            const keywords = aiKeywords.value.trim();
            const content = aiContent.value.trim();

            let isValid = true;

            if (!product) {
                document.getElementById('error-ai-product').style.display = 'block';
                aiProduct.closest('.form-group').classList.add('has-error');
                isValid = false;
            } else {
                document.getElementById('error-ai-product').style.display = 'none';
                aiProduct.closest('.form-group').classList.remove('has-error');
            }

            if (!title) {
                document.getElementById('error-ai-title').style.display = 'block';
                aiTitle.closest('.form-group').classList.add('has-error');
                isValid = false;
            } else {
                document.getElementById('error-ai-title').style.display = 'none';
                aiTitle.closest('.form-group').classList.remove('has-error');
            }

            if (!keywords) {
                document.getElementById('error-ai-keywords').style.display = 'block';
                aiKeywords.closest('.form-group').classList.add('has-error');
                isValid = false;
            } else {
                document.getElementById('error-ai-keywords').style.display = 'none';
                aiKeywords.closest('.form-group').classList.remove('has-error');
            }

            if (!content) {
                document.getElementById('error-ai-content').style.display = 'block';
                aiContent.closest('.form-group').classList.add('has-error');
                isValid = false;
            } else {
                document.getElementById('error-ai-content').style.display = 'none';
                aiContent.closest('.form-group').classList.remove('has-error');
            }

            if (!isValid) return;

            // Generate 고유 ID: AI-YYYY-XXXX (where XXXX is random number)
            const now = new Date();
            const rand = Math.floor(1000 + Math.random() * 9000);
            const id = `AI-${now.getFullYear()}-${rand}`;

            // AI가 쓴 본문이 아니라 직접 쓴 경우 HTML 형식으로 포맷팅 매핑
            let finalDescription = '';
            if (content.includes('<h4>')) {
                finalDescription = content;
            } else {
                // 줄바꿈을 반영한 문단 구조화
                const lines = content.split('\n');
                let inList = false;
                
                finalDescription = '<h4>[1] 이상 증상 원인 분석 및 현황</h4>\n<ul>\n';
                lines.forEach((line, index) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return;

                    if (index === Math.floor(lines.length / 2)) {
                        finalDescription += '</ul>\n<h4>[2] AI 조치 가이드 및 해결 방안</h4>\n<ul>\n';
                    }
                    finalDescription += `<li>${cleanLine}</li>\n`;
                });
                finalDescription += '</ul>\n';
            }

            // 요약 만들기
            const plainTextSummary = content.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 120) + '...';

            const newAIExplanation = {
                id: id,
                product: product,
                title: title,
                keywords: keywords,
                summary: plainTextSummary,
                description: finalDescription,
                writer: 'BATECH AI Engineer',
                createdAt: now.toLocaleString('ko-KR')
            };

            // DB 저장 및 리셋
            saveAIExplanation(newAIExplanation);
            aiForm.reset();
            
            // 터미널 완료 리포트 및 상태 복귀
            terminalBody.innerHTML = `
                <div class="terminal-line"><span class="prompt">$</span> BATECH-AI-ENGINE 지식 베이스 성공적 적재.</div>
                <div class="terminal-line"><span class="prompt">$</span> 신규 기술문서 ID: ${id} 등록 완료.</div>
                <div class="terminal-line"><span class="prompt">$</span> 대기 중... 새로운 대상 제품과 키워드를 선택하고 자동 생성을 진행해 주십시오.</div>
            `;
            terminalStatus.textContent = 'READY';
            terminalStatus.className = 'terminal-status';
            terminalProgress.style.width = '0%';

            alert('신규 AI 기술 설명서가 게시판에 정상적으로 등록되었습니다!');
        }

        // 실시간 에러 박스 소멸을 위한 인풋 체인지 리스너들
        const aiFields = [
            { input: aiProduct, err: 'error-ai-product' },
            { input: aiTitle, err: 'error-ai-title' },
            { input: aiKeywords, err: 'error-ai-keywords' },
            { input: aiContent, err: 'error-ai-content' }
        ];

        aiFields.forEach(field => {
            if (field.input) {
                const event = field.input.tagName === 'SELECT' ? 'change' : 'input';
                field.input.addEventListener(event, () => {
                    if (field.input.value.trim() !== '') {
                        document.getElementById(field.err).style.display = 'none';
                        field.input.closest('.form-group').classList.remove('has-error');
                    }
                });
            }
        });

        // 최초 렌더링 기동
        const initialList = getAIExplanations();
        renderBoardItems(initialList);
    }
});

