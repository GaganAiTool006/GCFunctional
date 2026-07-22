(() => {
  const USERS_KEY = 'nexapay_users';
  const SESSION_KEY = 'nexapay_session';
  const TRANSACTIONS_KEY = 'nexapay_transactions';

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const initializeDemo = () => {
    const users = readJson(USERS_KEY, []);
    if (!users.some((user) => user.email === 'demo@nexapay.test')) {
      users.push({
        id: 'USR-DEMO',
        name: 'Demo User',
        email: 'demo@nexapay.test',
        mobile: '+91 98765 43210',
        password: 'Demo@123',
        referral: 'NEXA2026',
        createdAt: new Date().toISOString()
      });
      writeJson(USERS_KEY, users);
    }
  };

  const showAlert = (message, type = 'error') => {
    const alert = document.getElementById('authAlert');
    if (!alert) return;
    alert.textContent = message;
    alert.className = `alert ${type}`;
  };

  const toast = (message) => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = message;
    container.appendChild(item);
    setTimeout(() => item.remove(), 2800);
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.textContent = visible ? 'Show' : 'Hide';
    });
  });

  document.getElementById('forgotButton')?.addEventListener('click', () => {
    toast('Demo mode: password reset can be connected to your backend.');
  });

  document.getElementById('loginForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const users = readJson(USERS_KEY, []);

    if (!isValidEmail(email)) {
      showAlert('Please enter a valid email address.');
      return;
    }
    if (!password) {
      showAlert('Please enter your password.');
      return;
    }

    const user = users.find((entry) => entry.email === email && entry.password === password);
    if (!user) {
      showAlert('Email or password is incorrect. Use the demo details shown on this page.');
      return;
    }

    writeJson(SESSION_KEY, { userId: user.id, email: user.email, loggedInAt: new Date().toISOString() });
    window.location.href = 'app.html#home';
  });

  document.getElementById('registerForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('fullName').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const referral = document.getElementById('referral').value.trim();
    const terms = document.getElementById('terms').checked;
    const users = readJson(USERS_KEY, []);

    if (name.length < 2) return showAlert('Please enter your full name.');
    if (mobile.length < 8) return showAlert('Please enter a valid mobile number.');
    if (!isValidEmail(email)) return showAlert('Please enter a valid email address.');
    if (password.length < 8) return showAlert('Password must contain at least 8 characters.');
    if (password !== confirmPassword) return showAlert('Passwords do not match.');
    if (!terms) return showAlert('Please accept the Terms and Privacy Policy.');
    if (users.some((user) => user.email === email)) return showAlert('An account already exists with this email.');

    const user = {
      id: `USR-${Date.now()}`,
      name,
      mobile,
      email,
      password,
      referral,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    writeJson(USERS_KEY, users);
    writeJson(SESSION_KEY, { userId: user.id, email: user.email, loggedInAt: new Date().toISOString() });
    writeJson(`${TRANSACTIONS_KEY}_${user.id}`, []);
    window.location.href = 'app.html#home';
  });

  initializeDemo();
})();
