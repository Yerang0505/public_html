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
    // Web3Forms API Access Key (https://web3forms.com에서 무료 발급 가능)
    const WEB3FORMS_ACCESS_KEY = 'YOUR_ACCESS_KEY_HERE';

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

            // Web3Forms API Data
            const formData = {
                access_key: WEB3FORMS_ACCESS_KEY,
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                subject: `[비에이텍 문의] ${categoryInput.value} - ${titleInput.value.trim()}`,
                message: `접수번호: ${ticketId}\n작성자/회사명: ${nameInput.value.trim()}\n이메일: ${emailInput.value.trim()}\n문의유형: ${categoryInput.value}\n작성일시: ${now.toLocaleString('ko-KR')}\n\n[문의내용]\n${contentInput.value.trim()}`
            };

            // Send Inquiry details via Web3Forms API
            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(async (res) => {
                const data = await res.json();
                if (res.status === 200) {
                    console.log('이메일 전송 성공:', data);
                } else {
                    console.warn('이메일 전송 실패 (웹서브미션 API 에러. API 키 또는 네트워크 상태를 확인하세요):', data);
                }
            })
            .catch(err => {
                console.error('이메일 전송 에러:', err);
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
                case '사용 문제': return 'use-problem';
                case '고장 및 수리': return 'repair';
                case '일반 문의': return 'general';
                case '기타': return 'etc';
                default: return 'default';
            }
        }
    }

    // --- 내부 임직원용 PDF 아카이브 및 뷰어 제어 엔진 (internal.html 전용) ---
    const internalLayout = document.querySelector('.internal-doc-layout');
    if (internalLayout) {
        // PDF documents metadata
        const documents = {
            'web-build': {
                fileName: '웹사이트 구축 자료.pdf',
                title: '웹사이트 구축 자료',
                size: '1.38 MB',
                tag: '웹 개발'
            },
            'prompt-guide': {
                fileName: 'Prompt작성가이드 자료.pdf',
                title: 'Prompt작성가이드 자료',
                size: '193 KB',
                tag: '프롬프트'
            },
            'data-analysis': {
                fileName: 'GenAI를 활용한 데이터 분석 자료.pdf',
                title: 'GenAI를 활용한 데이터 분석 자료',
                size: '232 KB',
                tag: '데이터 분석'
            },
            'presentation-ai': {
                fileName: '발표자료 생성 AI 자료.pdf',
                title: '발표자료 생성 AI 자료',
                size: '2.77 MB',
                tag: '발표자료 AI'
            },
            'gems-cardnews': {
                fileName: 'GEMS 가이드와 카드뉴스 제작 자료.pdf',
                title: 'GEMS 가이드와 카드뉴스 제작 자료',
                size: '444 KB',
                tag: '카드뉴스'
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
                    loadingMsgEl.textContent = `"${docInfo.title}" 문서를 불러오고 있습니다...`;
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
                        loadingMsgEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> 파일을 불러오는데 실패했습니다.</span><br><span style="font-size: 0.85rem; color: rgba(255,255,255,0.5);">경로: ./${docInfo.fileName}</span>`;
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

            // Also support clicking the "바로보기" (View Now) button inside cards
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

