/* 
   Universitas Pelita Bangsa - Client-side Logic
*/

document.addEventListener('DOMContentLoaded', () => {

    // --- Supabase Config ---
    const supabaseUrl = 'https://oypmvarhedxcwrclzpup.supabase.co';
    const supabaseKey = 'sb_publishable_goV8IJgbjqbFDH30A36X2A_PMAS_6Ao'; // Public Anon Key
    const _db = supabase.createClient(supabaseUrl, supabaseKey);

    // --- Check Auth for Navbar ---
    checkNavbarAuth();

    async function checkNavbarAuth() {
        const { data: { session } } = await _db.auth.getSession();
        const loginBtn = document.getElementById('nav-login-btn');
        const profileEl = document.getElementById('nav-user-profile');
        const userAvatar = document.getElementById('nav-user-avatar');
        const userName = document.getElementById('nav-user-name');

        if (session) {
            // Logged In
            if (loginBtn) loginBtn.parentElement.style.display = 'none'; // Hide Register List Item
            if (profileEl) {
                profileEl.style.display = 'flex';
                const meta = session.user.user_metadata;

                // Set Name
                if (meta.full_name) userName.innerText = meta.full_name.split(' ')[0]; // Show First Name
                else userName.innerText = session.user.email.split('@')[0];

                // Set Avatar
                if (meta.avatar_url) userAvatar.src = meta.avatar_url;
                else userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName.innerText)}&background=random`;
            }
        } else {
            // Not Logged In
            if (loginBtn) loginBtn.parentElement.style.display = 'block';
            if (profileEl) profileEl.style.display = 'none';
        }
    }

    // --- Dynamic Hero Overlay Settings ---
    loadHeroSettings();

    function hexToRgb(hex) {
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    }

    async function loadHeroSettings() {
        const { data } = await _db.from('settings').select('value').eq('key', 'hero_overlay_config').single();
        if (data && data.value) {
            try {
                const config = JSON.parse(data.value);
                const overlay = document.querySelector('.hero-overlay');
                // Apply if elements exist and config is valid
                if (overlay && config.color && config.opacity) {
                    const rgb = hexToRgb(config.color);
                    const opacity = parseInt(config.opacity) / 100;

                    // Logic: Base opacity is set by user. Bottom opacity is slighty less to keep the gradient effect (fade to bottom)
                    // If user sets 100%, bottom is 85%. If 50%, bottom is 35%. 
                    const opacityTop = opacity;
                    const opacityBottom = Math.max(0, opacity - 0.15);

                    overlay.style.background = `linear-gradient(rgba(${rgb}, ${opacityTop}), rgba(${rgb}, ${opacityBottom}))`;
                }

                // Apply Rounded Bottom
                const heroSection = document.querySelector('.hero');
                if (heroSection && config.rounded !== undefined) {
                    const radius = config.rounded + 'px';
                    // We only want to round the bottom corners
                    heroSection.style.borderBottomLeftRadius = radius;
                    heroSection.style.borderBottomRightRadius = radius;
                    // Ensure overflow hidden is set so content clips
                    heroSection.style.overflow = 'hidden';
                }

                // Apply Gradient Height
                if (heroSection && config.gradient !== undefined) {
                    heroSection.style.setProperty('--hero-gradient-height', config.gradient + 'rem');
                }
            } catch (e) {
                console.error('Error applying hero settings', e);
            }
        }
    }

    // --- Mobile Menu Toggle ---
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const overlay = document.querySelector('.mobile-menu-overlay');

    function toggleMenu() {
        navLinks.classList.toggle('active');
        overlay.classList.toggle('active');
        const icon = navLinks.classList.contains('active') ? 'x' : 'menu';
        mobileBtn.innerHTML = `<i data-feather="${icon}"></i>`;
        feather.replace();
    }



    // --- Toggle Hero Overlay Logic ---
    window.toggleHeroOverlay = function (show) {
        const overlay = document.getElementById('glass-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('active');
                // Scroll to top to ensure visibility
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                overlay.classList.remove('active');
            }
        }
    };

    // --- Global Toast Notification ---
    window.showToast = function (message, type = 'info') {
        const icons = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
        };

        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // --- Hero Google Login (Saves Data + Auth) ---
    const googleBtn = document.getElementById('hero-google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            // 1. Validate Inputs (Trimmed)
            const name = document.getElementById('hero-name').value.trim();
            const phone = document.getElementById('hero-phone').value.trim();

            console.log("Input Data:", { name, phone }); // Debug Log

            if (!name || !phone) {
                showToast('Mohon lengkapi Nama dan Nomor WhatsApp terlebih dahulu.', 'error');
                return;
            }

            const btnSpan = googleBtn.querySelector('span');
            const originalText = btnSpan.innerText;
            btnSpan.innerText = 'Menyimpan & Menghubungkan...';
            googleBtn.disabled = true;

            try {
                // 2. Save Lead Data
                const { error: dbError } = await _db.from('leads').insert([{
                    name: name,
                    phone: phone
                    // created_at removed because column doesn't exist in user's DB
                }]);

                if (dbError) {
                    console.error('Save Lead Error:', dbError);
                    showToast('Gagal menyimpan data ke database. Silakan hubungi admin.', 'error');
                } else {
                    console.log('Lead saved successfully.');
                }

                // 3. Send WhatsApp Notification
                try {
                    console.log('Sending WhatsApp...');
                    const waResult = await window.sendWhatsappMessage(phone, name);
                    if (!waResult || !waResult.status) {
                        console.warn('WhatsApp API Response:', waResult);
                    } else {
                        console.log('WhatsApp sent!');
                    }
                } catch (waErr) {
                    console.error('WhatsApp Logic Error:', waErr);
                }

                // 3.5 Save Phone to LocalStorage for Email Merge on Profile Page
                localStorage.setItem('pending_lead_phone', phone);

                // 4. Trigger Google Auth
                const { error: authError } = await _db.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/profile.html'
                    }
                });
                if (authError) throw authError;

            } catch (err) {
                console.error('Process Error:', err);
                showToast('Terjadi kesalahan saat menghubungkan. Coba lagi.', 'error');
                btnSpan.innerText = originalText;
                googleBtn.disabled = false;
            }
        });
    }

    // --- Offer Google Login (Claim 50% Discount) ---
    const offerGoogleBtn = document.getElementById('offer-google-login');
    if (offerGoogleBtn) {
        offerGoogleBtn.addEventListener('click', async () => {
            // 1. Validate Inputs
            const name = document.getElementById('offer-name').value.trim();
            const phone = document.getElementById('offer-phone').value.trim();

            // Generate Random Voucher (Format: UPB2025 + 4 chars)
            const prefix = 'UPB2025';
            const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const voucherCode = `${prefix}${suffix}`;

            if (!name || !phone) {
                showToast('Mohon lengkapi Nama dan Nomor WhatsApp untuk klaim diskon.', 'error');
                return;
            }

            const btnSpan = offerGoogleBtn.querySelector('span');
            const originalText = btnSpan.innerText;
            btnSpan.innerText = 'Mengklaim...';
            offerGoogleBtn.disabled = true;

            try {
                // 2. Save Lead Data
                const { error: dbError } = await _db.from('leads').insert([{
                    name: name,
                    phone: phone,
                    voucher: voucherCode
                }]);

                if (dbError) {
                    console.error('Save Lead Error:', dbError);
                    showToast('Gagal menyimpan data klaim. Silakan coba lagi.', 'error');
                }

                // 3. Send Confirm WhatsApp
                try {
                    await window.sendWhatsappMessage(phone, name, voucherCode);
                } catch (waErr) {
                    console.error('WhatsApp Error:', waErr);
                }

                // 3.5 Save Phone for Merge
                localStorage.setItem('pending_lead_phone', phone);

                // 4. Trigger Google Auth
                const { error: authError } = await _db.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/profile.html'
                    }
                });
                if (authError) throw authError;

            } catch (err) {
                console.error('Claim Error:', err);
                showToast('Terjadi kesalahan. Coba lagi.', 'error');
                btnSpan.innerText = originalText;
                offerGoogleBtn.disabled = false;
            }
        });
    }

    if (mobileBtn) {
        mobileBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }

    const closeBtn = document.getElementById('close-menu');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMenu();
        });
    }





    // Bind Nav Button to Overlay
    const navRegisterBtn = document.getElementById('nav-login-btn');
    if (navRegisterBtn) {
        navRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleHeroOverlay(true);
        });
    }

    // Smooth scrolling & close menu on click
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Special handling for signup link is now separate
            if (this.getAttribute('href') === '#hero-signup-form') {
                e.preventDefault();
                toggleHeroOverlay(true);
                return;
            }

            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close menu if open
                if (navLinks.classList.contains('active')) {
                    toggleMenu();
                }

                // Account for fixed header
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // --- Sticky Navbar Shadow ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.style.boxShadow = 'var(--shadow-md)';
        } else {
            navbar.style.boxShadow = 'var(--shadow-sm)';
        }
    });

    // --- Stats Counter Animation ---
    const statsSection = document.querySelector('.stats');
    const stats = document.querySelectorAll('.stat-number');
    let started = false;

    function startCount(el) {
        const target = parseInt(el.dataset.target);
        const count = +el.innerText.replace('+', ''); // handle if we add + later
        const increment = target / 200; // speed

        if (count < target) {
            el.innerText = Math.ceil(count + increment);
            setTimeout(() => startCount(el), 10);
        } else {
            el.innerText = target + "+"; // Add plus sign at end
        }
    }

    // Intersection Observer for Scroll Trigger
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !started) {
                stats.forEach(stat => startCount(stat));
                started = true;
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    if (statsSection) {
        observer.observe(statsSection);
    }

    // --- General Scroll Animations (Fade Up) ---
    const fadeElements = document.querySelectorAll('.fade-up');
    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    fadeElements.forEach(el => fadeObserver.observe(el));

    // --- Faculty Expand/Collapse ---
    const facultyCards = document.querySelectorAll('.faculty-card');
    facultyCards.forEach(card => {
        card.addEventListener('click', () => {
            // Toggle active class on card
            card.classList.toggle('active');

            // Toggle details height
            const details = card.querySelector('.faculty-details');
            const icon = card.querySelector('.faculty-toggle-icon');

            if (details) {
                if (details.classList.contains('expanded')) {
                    details.classList.remove('expanded');
                } else {
                    // Start: Collapse others (Accordion style - optional, but cleaner)
                    // facultyCards.forEach(c => {
                    //     if(c !== card) {
                    //         c.classList.remove('active');
                    //         const d = c.querySelector('.faculty-details');
                    //         if(d) d.classList.remove('expanded');
                    //     }
                    // });
                    // End: Collapse others

                    details.classList.add('expanded');
                }
            }
        });
    });

    // Initialize Feather Icons again just in case
    feather.replace();

    // --- Promo System (Supabase Controlled) ---
    const offerBtn = document.getElementById('special-offer-btn');
    const offerModal = document.getElementById('offer-modal');
    const closeOfferBtn = document.getElementById('close-offer-modal'); // Kept as closeOfferBtn for consistency with existing listeners
    const offerForm = document.getElementById('offer-form');

    // Load Settings from Supabase
    // Default Hidden to prevent flashing
    if (offerBtn) offerBtn.style.display = 'none';

    loadPromoSettings();

    async function loadPromoSettings() {
        try {
            console.log('Checking Promo Status...');
            // 1. Check Status (Remove .single() to avoid 406 errors on empty)
            const { data: statusData, error } = await _db.from('settings').select('value').eq('key', 'offer_status');

            console.log('Promo Status Data:', statusData);
            if (error) console.error('Promo Fetch Error:', error);

            // Logic: Check if array has items and value is 'active'
            const isActive = statusData && statusData.length > 0 && statusData[0].value === 'active';

            if (isActive) {
                // 2. Load Config (Texts)
                const { data: configData } = await _db.from('settings').select('value').eq('key', 'offer_config');
                if (configData && configData.length > 0) {
                    try {
                        const config = JSON.parse(configData[0].value);
                        if (config.btnTitle) document.querySelector('.offer-title').innerText = config.btnTitle;
                    } catch (e) { console.error('Config Parse Error', e); }
                }

                // Show Button
                if (offerBtn) {
                    offerBtn.style.display = 'flex';
                    setTimeout(() => {
                        offerBtn.classList.add('show');
                    }, 500);
                }
            } else {
                console.log('Promo is Inactive or Not Found.');
                if (offerBtn) offerBtn.style.display = 'none';
            }

        } catch (err) {
            console.error('Promo Settings Error:', err);
            // Default: Keep Hidden on Error
            if (offerBtn) offerBtn.style.display = 'none';
        }
    }

    // Modal Triggers
    if (offerBtn && offerModal && closeOfferBtn) { // Ensure all elements exist
        // Open Modal
        offerBtn.addEventListener('click', () => {
            offerModal.classList.add('active');
            offerBtn.style.animation = 'none'; // Stop bounce animation
            startCountdown(); // Start the timer when modal opens
        });

        // Close Modal
        closeOfferBtn.addEventListener('click', () => {
            offerModal.classList.remove('active');
        });

        // Close on Outside Click
        offerModal.addEventListener('click', (e) => {
            if (e.target === offerModal) {
                offerModal.classList.remove('active');
            }
        });

        // Countdown Timer Logic
        function startCountdown() {
            // Set countdown to 1 hour from now for "Limited Offer" effect
            // Check if we already have a stored end time in this session to persist it slightly
            let endTime = sessionStorage.getItem('offerEndTime');

            if (!endTime) {
                const now = new Date().getTime();
                endTime = now + (60 * 60 * 1000); // 1 hour
                sessionStorage.setItem('offerEndTime', endTime);
            }

            const timerInterval = setInterval(() => {
                const now = new Date().getTime();
                const distance = endTime - now;

                if (distance < 0) {
                    // Loop back to 59 minutes
                    const oneHourLater = new Date().getTime() + (59 * 60 * 1000);
                    sessionStorage.setItem('offerEndTime', oneHourLater);
                    endTime = oneHourLater;
                    return;
                }

                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                // Add leading zeros
                document.getElementById("hours").innerText = hours < 10 ? "0" + hours : hours;
                document.getElementById("minutes").innerText = minutes < 10 ? "0" + minutes : minutes;
                document.getElementById("seconds").innerText = seconds < 10 ? "0" + seconds : seconds;

            }, 1000);
        }

        if (offerForm) {
            const submitBtn = offerForm.querySelector('button[type="submit"]');
            const nameInput = document.getElementById('offer-name');
            const emailInput = document.getElementById('offer-email');
            const phoneInput = document.getElementById('offer-phone');

            // Helper: Format Phone for display/check
            function formatPhoneValue(p) {
                p = p.trim();
                p = p.replace(/[^0-9+]/g, '');
                if (p.startsWith('0')) return '+62' + p.slice(1);
                if (p.startsWith('62')) return '+' + p;
                return p;
            }

            // Real-time Validation Function
            function checkFormValidity() {
                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                const phone = phoneInput.value.trim();

                let isValid = true;

                // Name Check
                if (name.length === 0) isValid = false;

                // Email Check
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) isValid = false;

                // Phone Check
                // We use the cleaned version to check length
                const formattedPhone = formatPhoneValue(phone);
                // Basic length check (Indonesia typically 10-13 digits). 
                // We check if it's at least close to valid (e.g. +628...) which is 3+1+8=12 chars usually, but simplest is length > 10
                if (formattedPhone.length < 10) isValid = false;

                submitBtn.disabled = !isValid;
            }

            // Attach Listeners for Real-time Button State
            [nameInput, emailInput].forEach(input => {
                input.addEventListener('input', checkFormValidity);
                input.addEventListener('change', checkFormValidity);
            });

            // Phone Input Parsing (xxxx-xxxx-xxxx)
            phoneInput.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                if (val.length > 16) val = val.slice(0, 16); // Limit length

                // Group by 4
                let formatted = val.match(/.{1,4}/g)?.join('-') || val;

                // Only update if different to avoid cursor weirdness (basic)
                if (e.target.value !== formatted) {
                    e.target.value = formatted;
                }

                checkFormValidity();
            });
            phoneInput.addEventListener('change', checkFormValidity);

            // Attach Listeners for Auto-Notifications (on Blur)
            nameInput.addEventListener('blur', () => {
                if (nameInput.value.trim() === '') {
                    showToast('Nama Lengkap wajib diisi ya.', 'info');
                }
            });

            emailInput.addEventListener('blur', () => {
                const val = emailInput.value.trim();
                if (val.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                    showToast('Format Email sepertinya salah. Mohon diperbaiki.', 'error');
                }
            });

            phoneInput.addEventListener('blur', () => {
                const val = phoneInput.value.trim();
                if (val.length > 0) {
                    const formatted = formatPhoneValue(val);
                    if (formatted.length < 10) {
                        showToast('Nomor WhatsApp terlalu pendek (min. 10 digit).', 'error');
                    }
                }
            });

            // Check initially
            checkFormValidity();

            offerForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Re-validate just in case (though button should be disabled)
                // ... (Using previous logic but condensed since we trust the button state more now, but safe to keep checks)

                const originalText = submitBtn.innerText;
                let name = nameInput.value.trim();
                const email = emailInput.value.trim();
                let phone = phoneInput.value; // Get raw value

                // Final Clean for Submission
                phone = formatPhoneValue(phone);

                // Generate Voucher Code
                const year = new Date().getFullYear();
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let randomStr = '';
                for (let i = 0; i < 4; i++) {
                    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                const voucherCode = `UPB${year}${randomStr}`;

                submitBtn.innerText = 'Mengirim...';
                submitBtn.disabled = true;

                // _db is already initialized at top of file
                // const supabaseUrl = ... (Removed)
                // const supabaseKey = ... (Removed)
                // const _db = ... (Removed)

                const { error } = await _db
                    .from('leads')
                    .insert({
                        name: name,
                        email: email,
                        phone: phone,
                        voucher: voucherCode
                    });

                if (error) {
                    console.error('Supabase Error:', error);
                    let msg = 'Gagal menyimpan data.';

                    if (error.code === '42501' || (error.message && error.message.includes('row-level security'))) {
                        msg = 'Akses Ditolak: Cek "RLS Policies" di Supabase.';
                    } else if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) {
                        msg = 'Anda sudah terdaftar sebelumnya! (Data duplikat).';
                    } else if (error.message) {
                        msg = `Error: ${error.message}`;
                    }
                    showToast(msg, 'error');
                    submitBtn.innerText = originalText;
                    checkFormValidity(); // Re-enable if valid (it should be)
                } else {
                    // Success!
                    showToast(`Berhasil! Kode Voucher <b>${voucherCode}</b> sedang dikirim ke WhatsApp...`, 'success');

                    // Send WhatsApp via Fonnte
                    sendWhatsappMessage(phone, name, voucherCode);

                    offerModal.classList.remove('active');
                    offerForm.reset();
                    submitBtn.innerText = originalText;
                    checkFormValidity(); // Will disable it since form is empty
                }
            });

            // --- Fonnte WhatsApp Integration ---
            // Moved to global scope or reused
        }
    }
}); // End DOMContentLoaded (ensure this matches original structure)

// --- Global Fonnte Helper ---
window.sendWhatsappMessage = async function (target, name, voucher = null) {
    if (!target) return;

    // Formatting: Ensure 62 prefix
    let formattedTarget = target.trim();
    if (formattedTarget.startsWith('0')) {
        formattedTarget = '62' + formattedTarget.slice(1);
    } else if (formattedTarget.startsWith('+')) {
        formattedTarget = formattedTarget.substring(1);
    }

    console.log(`Sending WhatsApp to: ${formattedTarget}, Name: ${name}`);

    let message = '';

    if (voucher) {
        // Voucher Message
        message = `Halo Kak *${name}*! 👋\n\nTerima kasih sudah mendaftar di *Universitas Pelita Bangsa*.\n\n🎟️ Kode Voucher Anda: *${voucher}*\n\nSilakan tunjukkan kode ini ke bagian pendaftaran atau gunakan saat daftar ulang untuk mendapatkan diskon spesial 50%.\n\n_Pesan ini dikirim otomatis oleh sistem._`;
    } else {
        // Standard Registration Message
        message = `Halo Kak *${name}*! 👋\n\nSelamat Bergabung di *Universitas Pelita Bangsa*! 🎓\n\nTerima kasih telah memulai langkah suksesmu hari ini. Pendaftaran Anda telah kami terima.\n\nTim admin kami akan segera menghubungi Anda untuk informasi selanjutnya.\n\n_Pesan ini dikirim otomatis oleh sistem._`;
    }

    const formData = new FormData();
    formData.append('target', formattedTarget);
    formData.append('message', message);
    formData.append('countryCode', '62');

    try {
        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': 'kmi7D56VnH37u5Bmy9e5' // User's API Key
            },
            body: formData
        });
        const result = await response.json();
        console.log('Fonnte Status:', result);
        return result;
    } catch (err) {
        console.error('Fonnte API Error:', err);
        return null;
    }
};



// --- Professional Toast Notification System ---
function showToast(message, type = 'info') {
    const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Gallery Modal Logic
function openGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Close Gallery Modal when clicking outside (Event Delegation or Direct Attach)
document.addEventListener('DOMContentLoaded', () => {
    const galleryModal = document.getElementById('gallery-modal');
    if (galleryModal) {
        galleryModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeGalleryModal();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && galleryModal.classList.contains('active')) {
                closeGalleryModal();
            }
        });
    }
});

// --- Hybrid AI Assistant Logic ---
const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE"; // Ganti dengan API Key Anda

// System Prompt for Groq (Same as ElevenLabs)
const SYSTEM_PROMPT = `
You are the official Virtual Assistant of **Universitas Pelita Bangsa (UPB)**.
Your name is "Pelita AI".
You MUST speak in **Bahasa Indonesia** unless the user speaks English first.

**Knowledge Base:**
*   **University Name:** Universitas Pelita Bangsa (UPB).
*   **Location:** Ruko Bekasi Mas, Jl. Ahmad Yani, Bekasi Selatan, Jawa Barat 17148.
*   **Rector:** Hamzah M. Mardi Putra, S.K.M., M.M., D.B.A.
*   **Vision:** To become an international-class entrepreneur university by 2045.
*   **Promo:** Diskon 50% available today. Claim via "Daftar Sekarang" with Google Login.
*   **Faculties:** Ekonomi & Bisnis, Teknik (Informatika, Sipil, Arsitektur), Hukum, Keguruan.

**Scope Limit:** Only answer questions about the university. If unsure, apologize and ask to contact admin.
`;

let chatHistory = [
    { role: "system", content: SYSTEM_PROMPT }
];

// 1. Modal Logic
function openAIChoiceModal() {
    document.getElementById('ai-choice-modal').classList.add('active');
}

function closeAIChoiceModal() {
    document.getElementById('ai-choice-modal').classList.remove('active');
}

// 2. Voice Mode (ElevenLabs)
// 2. Voice Mode (ElevenLabs)
function startAIVoice() {
    closeAIChoiceModal();

    // Check if already active
    if (document.querySelector('elevenlabs-convai')) return;

    const container = document.getElementById('elevenlabs-container');

    // 1. Create Widget
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', 'agent_1801kcnt53fnenzab5hssg7x2ex7');
    container.appendChild(widget);

    // 2. Load Script if needed
    if (!document.querySelector('script[src="https://elevenlabs.io/convai-widget/index.js"]')) {
        const script = document.createElement('script');
        script.src = "https://elevenlabs.io/convai-widget/index.js";
        script.async = true;
        script.type = "text/javascript";
        document.body.appendChild(script);
    }

    // 3. Create Custom Close Button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'voice-widget-close';
    closeBtn.innerHTML = '<i data-feather="x"></i>';
    closeBtn.onclick = stopAIVoice;
    document.body.appendChild(closeBtn);

    // 4. Add Active Class for styling
    document.body.classList.add('voice-active');

    // Re-init Feather icons
    setTimeout(feather.replace, 100);

    showToast('Menghubungkan ke Voice Assistant... 🎙️', 'info');
}

function stopAIVoice() {
    const container = document.getElementById('elevenlabs-container');
    container.innerHTML = ''; // Clear widget

    const closeBtn = document.querySelector('.voice-widget-close');
    if (closeBtn) closeBtn.remove();

    // Remove Active Class
    document.body.classList.remove('voice-active');

    showToast('Voice Assistant dimatikan.', 'info');
}

// 3. Text Chat Mode (Groq)
function startAIChat() {
    closeAIChoiceModal();
    const chatWindow = document.getElementById('ai-chat-window');
    chatWindow.classList.add('active');
    document.getElementById('chat-input').focus();
}

function closeAIChat() {
    document.getElementById('ai-chat-window').classList.remove('active');
}

// 4. Send Message Logic
async function sendChatMessage() {
    const inputField = document.getElementById('chat-input');
    const message = inputField.value.trim();
    if (!message) return;

    // Add User Message to UI
    appendMessage(message, 'user');
    inputField.value = '';

    // Add User Message to History
    chatHistory.push({ role: "user", content: message });

    // Show Typing Indicator
    const typingId = showTypingIndicator();

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: chatHistory,
                model: "llama-3.3-70b-versatile",
                temperature: 0.6,
                max_tokens: 256
            })
        });

        const data = await response.json();
        removeTypingIndicator(typingId);

        if (!response.ok) {
            const errorMsg = data.error?.message || `Error ${response.status}: ${response.statusText}`;
            throw new Error(errorMsg);
        }

        if (data.choices && data.choices[0]) {
            const botReply = data.choices[0].message.content;
            appendMessage(botReply, 'bot');
            chatHistory.push({ role: "assistant", content: botReply });
        } else {
            throw new Error('Format respons API tidak valid.');
        }

    } catch (error) {
        console.error('Groq Error:', error);
        removeTypingIndicator(typingId);
        // Display specific error for debugging
        appendMessage(`⚠️ Eror: ${error.message}. (Cek Console/API Key)`, 'bot');
    }
}

// UI Helper: Append Message
function appendMessage(text, sender) {
    const chatBox = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;

    // Parse Markdown-like simple bolding
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    msgDiv.innerHTML = formattedText;

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// UI Helper: Typing Indicator
function showTypingIndicator() {
    const chatBox = document.getElementById('chat-messages');
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = id;
    typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}
