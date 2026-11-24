// Vercel Serverless Function: Google OAuth 2.0 Callback Handler
// Sesuai panduan resmi Mr. Tio (Mutiara Bangsa 2 School)

export default async function handler(req, res) {
  const { code, error, access_token, id_token } = req.query;

  // 1. Jika ada error dari Google OAuth
  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Google Auth Error</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff0f5; color: #e11d48; text-align: center; }
          .card { background: white; padding: 24px; border-radius: 16px; border: 1px solid #fecdd3; max-width: 380px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>Autentikasi Gagal</h3>
          <p>${error}</p>
          <button onclick="window.close()" style="margin-top:12px; padding:8px 16px; border-radius:8px; background:#e11d48; color:white; border:none; cursor:pointer;">Tutup Jendela</button>
        </div>
      </body>
      </html>
    `);
  }

  // 2. Jika menerima authorization code (Authorization Code Flow)
  const clientId = process.env.GOOGLE_CLIENT_ID || '669779177636-77k3vg6sc2es3sd7roihmn6ffqgn2uc6.apps.googleusercontent.com';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/auth/callback/google`;

  let userProfile = null;

  if (code && clientSecret) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        userProfile = await userRes.json();
      }
    } catch (err) {
      console.error('Error exchanging Google code:', err);
    }
  }

  // 3. Return client bridge HTML
  // Menutup popup otomatis dan mengirim data user ke tab utama via postMessage
  return res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Google Sign-In Sukses</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #fff0f5;
          color: #db2777;
          text-align: center;
        }
        .spinner {
          width: 36px;
          height: 36px;
          border: 4px solid #fce7f3;
          border-top-color: #ec4899;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 14px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <p style="font-weight: 700; font-size: 14px;">Autentikasi Google Berhasil!</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Menutup jendela otomatis dan kembali ke aplikasi...</p>

      <script>
        (async function() {
          let user = ${userProfile ? JSON.stringify(userProfile) : 'null'};

          // Jika URL memiliki hash token (#access_token=...) dari client flow
          if (!user && window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const idToken = hashParams.get('id_token');

            if (accessToken) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: 'Bearer ' + accessToken }
                });
                user = await res.json();
              } catch (e) {
                console.warn('Fetch userinfo error:', e);
              }
            }

            if (!user && idToken) {
              try {
                const base64Url = idToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                const p = JSON.parse(jsonPayload);
                user = {
                  sub: p.sub,
                  name: p.name || p.given_name || 'Pengguna Google',
                  email: p.email,
                  picture: p.picture || ''
                };
              } catch (e) {}
            }
          }

          const formattedUser = user ? {
            name: user.name || user.given_name || (user.email ? user.email.split('@')[0] : 'Pengguna Google'),
            email: user.email || 'user@gmail.com',
            avatar: (user.name ? user.name.charAt(0) : 'G').toUpperCase(),
            avatarUrl: user.picture || '',
            provider: 'google',
            id: user.sub || 'usr_' + Date.now(),
            loginAt: Date.now()
          } : null;

          if (formattedUser) {
            localStorage.setItem('smart_grocery_user', JSON.stringify(formattedUser));
          }

          // Kirim pesan ke jendela utama (opener)
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_SUCCESS',
                user: formattedUser,
                hash: window.location.hash
              }, '*');
            } catch (e) {
              console.warn('postMessage error:', e);
            }
            setTimeout(() => {
              window.close();
            }, 150);
          } else {
            // Jika dibuka langsung di tab biasa, arahkan kembali ke beranda
            setTimeout(() => {
              window.location.href = '/';
            }, 250);
          }
        })();
      </script>
    </body>
    </html>
  `);
}
