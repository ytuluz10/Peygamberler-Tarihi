let currentLang = 'tr';
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isSpeaking = false;

document.addEventListener('DOMContentLoaded', () => {
    renderProphetList();
    setupEventListeners();
    loadLanguage();
    
    // Register Service Worker for PWA / offline
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('SW registration failed:', err));
    }
    
    // Load voices (needed for some browsers)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {};
    }
});

function loadLanguage() {
    const saved = localStorage.getItem('prophets_lang') || 'tr';
    setLanguage(saved);
}

function setLanguage(lang) {
    currentLang = lang;
    document.body.classList.toggle('en', lang === 'en');
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    localStorage.setItem('prophets_lang', lang);
    renderProphetList();
    stopSpeech();
}

function setupEventListeners() {
    // Menu
    document.getElementById('menu-btn').addEventListener('click', openDrawer);
    document.getElementById('close-drawer').addEventListener('click', closeDrawer);
    document.getElementById('overlay').addEventListener('click', closeAll);

    // Back
    document.getElementById('back-btn').addEventListener('click', closeDetail);

    // Speech
    document.getElementById('speech-btn').addEventListener('click', toggleSpeech);

    // Auth
    document.getElementById('register-btn').addEventListener('click', () => openAuth('register'));
    document.getElementById('login-btn').addEventListener('click', () => openAuth('login'));
    document.querySelector('.close-modal').addEventListener('click', closeAuth);
    document.getElementById('auth-form').addEventListener('submit', handleAuth);

    // Language
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
}

function getStoryText() {
    const storyEl = document.getElementById('detail-story');
    if (!storyEl) return '';
    // Get plain text without HTML tags
    return storyEl.innerText || storyEl.textContent || '';
}

function toggleSpeech() {
    if (isSpeaking) {
        stopSpeech();
    } else {
        startSpeech();
    }
}

function startSpeech() {
    if (!speechSynthesis) {
        alert(currentLang === 'tr' ? 'Tarayıcınız sesli okumayı desteklemiyor.' : 'Your browser does not support speech.');
        return;
    }

    // Ensure voices are loaded
    const speakNow = () => {
        stopSpeech();

        const text = getStoryText();
        if (!text.trim()) return;

        currentUtterance = new SpeechSynthesisUtterance(text);
        
        const lang = currentLang === 'tr' ? 'tr-TR' : 'en-US';
        currentUtterance.lang = lang;
        
        // Improved settings for better quality and clarity
        currentUtterance.rate = 0.88;
        currentUtterance.pitch = 1.0;
        currentUtterance.volume = 1.0;

        // Select the best available voice
        const voices = speechSynthesis.getVoices();
        let selectedVoice = null;

        if (currentLang === 'en') {
            const priorities = [
                v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Neural')),
                v => v.lang === 'en-US' && !v.localService,
                v => v.lang.startsWith('en-US'),
                v => v.lang.startsWith('en-GB'),
                v => v.lang.startsWith('en')
            ];
            for (const fn of priorities) {
                selectedVoice = voices.find(fn);
                if (selectedVoice) break;
            }
        } else {
            selectedVoice = voices.find(v => v.lang.startsWith('tr') && (v.name.includes('Google') || v.name.includes('Natural')))
                         || voices.find(v => v.lang.startsWith('tr-TR'))
                         || voices.find(v => v.lang.startsWith('tr'));
        }

        if (selectedVoice) {
            currentUtterance.voice = selectedVoice;
        }

        currentUtterance.onstart = () => {
            isSpeaking = true;
            const btn = document.getElementById('speech-btn');
            btn.classList.add('playing');
            btn.textContent = '⏹️';
        };

        currentUtterance.onend = () => {
            isSpeaking = false;
            const btn = document.getElementById('speech-btn');
            btn.classList.remove('playing');
            btn.textContent = '🔊';
        };

        currentUtterance.onerror = () => {
            stopSpeech();
        };

        speechSynthesis.speak(currentUtterance);
    };

    // Voices might not be loaded yet
    if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.onvoiceschanged = () => {
            speakNow();
            speechSynthesis.onvoiceschanged = null;
        };
    } else {
        speakNow();
    }
}

function stopSpeech() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
    isSpeaking = false;
    const btn = document.getElementById('speech-btn');
    if (btn) {
        btn.classList.remove('playing');
        btn.textContent = '🔊';
    }
    currentUtterance = null;
}

function renderProphetList() {
    const list = document.getElementById('prophet-list');
    list.innerHTML = '';
    prophets.forEach(p => {
        const item = document.createElement('div');
        item.className = 'prophet-item';
        item.innerHTML = `
            <div class="arabic-name">${p.name_ar}</div>
            <div class="name-info">
                <div class="name-main">${currentLang === 'tr' ? p.name_tr : p.name_en}</div>
                <div class="name-sub">${currentLang === 'tr' ? p.name_en : p.name_tr}</div>
            </div>
        `;
        item.addEventListener('click', () => openProphet(p));
        list.appendChild(item);
    });
}

function openDrawer() {
    document.getElementById('drawer').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

function closeDrawer() {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

function openProphet(prophet) {
    closeDrawer();
    document.getElementById('detail-arabic').textContent = prophet.name_ar;
    document.getElementById('detail-name').textContent = currentLang === 'tr' ? prophet.name_tr : prophet.name_en;
    document.getElementById('detail-title').textContent = currentLang === 'tr' ? prophet.name_tr : prophet.name_en;
    document.getElementById('detail-story').innerHTML = currentLang === 'tr' ? prophet.story_tr : prophet.story_en;
    
    const refsContainer = document.getElementById('detail-refs');
    refsContainer.innerHTML = '';
    prophet.refs.forEach(ref => {
        const div = document.createElement('div');
        div.className = 'ref-item';
        div.textContent = ref;
        refsContainer.appendChild(div);
    });

    document.getElementById('detail-overlay').classList.add('open');
}

function closeDetail() {
    stopSpeech();
    document.getElementById('detail-overlay').classList.remove('open');
}

function openAuth(type) {
    const title = document.getElementById('auth-title');
    title.textContent = type === 'register' 
        ? (currentLang === 'tr' ? 'Kayıt Ol' : 'Register')
        : (currentLang === 'tr' ? 'Giriş Yap' : 'Login');
    document.getElementById('auth-modal').classList.add('open');
}

function closeAuth() {
    document.getElementById('auth-modal').classList.remove('open');
}

function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    localStorage.setItem('prophets_user', JSON.stringify({ email, password }));
    alert(currentLang === 'tr' ? 'Başarılı! (Demo)' : 'Success! (Demo)');
    closeAuth();
    document.getElementById('auth-form').reset();
}

function closeAll() {
    closeDrawer();
    closeAuth();
}
